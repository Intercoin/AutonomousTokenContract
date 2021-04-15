// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./interfaces/ITransferRules.sol";
import "./IntercoinTrait.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";


contract TradedTokenContract is ERC777Upgradeable, OwnableUpgradeable, IntercoinTrait, IERC777RecipientUpgradeable, ERC1820ImplementerUpgradeable {
    using SafeMathUpgradeable for uint256;

    address public uniswapRouter;
    address public uniswapRouterFactory;


    IUniswapV2Router02 public uniswapV2Router;
    address public uniswapV2Pair;
    
    bool inSwapAndLiquify;
    bool public swapAndLiquifyEnabled = true;
    /**
     * Configured contract implementing token rule(s).
     * If set, transfer will consult this contract should transfer
     * be allowed after successful authorization signature check.
     * And call doTransfer() in order for rules to decide where fund
     * should end up.
     */
    ITransferRules public _rules;
    
    uint256 public liquidityPercent;
    uint256 public excessTokenSellSlippage;
    uint256 public sellPriceIncreaseMin;
    uint256 public sellEventsTotal;
    uint256 public currentPrice;
    uint256 private lastSellPrice;
    
    
    bool initialPriceSet;
    // predefine owners addresses
    address[] ownersAddresses;
    
    
    event RulesUpdated(address rules);

    event MinTokensBeforeSwapUpdated(uint256 minTokensBeforeSwap);
    event SwapAndLiquifyEnabledUpdated(bool enabled);
    event SwapAndLiquify(
        uint256 tokensSwapped,
        uint256 ethReceived,
        uint256 tokensIntoLiqudity
    );

    modifier lockTheSwap {
        inSwapAndLiquify = true;
        _;
        inSwapAndLiquify = false;
    }
    
    function donateETH() public payable {
        
    }
    
    //to recieve ETH from uniswapV2Router when swaping
    receive() external payable {}
    
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) 
        external 
        override
    {
        //require(msg.sender == address(_token), "Simple777Recipient: Invalid token");

        // do stuff
        //emit DoneStuff(operator, from, to, amount, userData, operatorData);
    }
    
    function initialize(
        string memory name, 
        string memory symbol, 
        address[] memory defaultOperators,
        address[] memory owners
    ) 
        public 
        virtual 
        initializer 
    {
        // Ethereum all networks
        // uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        // uniswapRouterFactory = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
        
        // BSC TestNet
        // uniswapRouter = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
        // uniswapRouterFactory = 0x6725F303b657a9451d8BA641348b6761A6CC7a17;

        // BSC MainNet
        uniswapRouter = 0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F;
        uniswapRouterFactory = 0xBCfCcbde45cE874adCB698cC183deBcF17952812;
    
        liquidityPercent = 10; // 10%
        excessTokenSellSlippage = 10; //10%
        sellPriceIncreaseMin = 10; // 10%
        sellEventsTotal = 100; // times to divide
        currentPrice = 0;
        lastSellPrice = 0;
    
    
        initialPriceSet = false;
    
        __Ownable_init();
        __ERC777_init(name, symbol, defaultOperators);
        __ERC1820Implementer_init();
        
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
        
        _mint(address(this), 1_000_000_000 * 10 ** 18, "", "");
        
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(uniswapRouter);
        
         // Create a uniswap pair for this new token
        uniswapV2Pair = IUniswapV2Factory(uniswapRouterFactory)
            .createPair(address(this), _uniswapV2Router.WETH());

        // set the rest of the contract variables
        uniswapV2Router = _uniswapV2Router;
        
        ownersAddresses = owners;
    }
    
    
    /**
     * @param price initial price 1 eth token mul by 1e9
     */
    function setInitialPrice(
        uint256 price
    ) public onlyOwner {
        require(initialPriceSet == false, 'Initial price has already set');
        uint256 ethAmount = address(this).balance;
        require(ethAmount != 0, 'balance is empty');
        //eth/price*1e9/1e18/1e9
        
        //uint256 tokenAmount = ethAmount.mul(price).div(1e9);
        
        //irb(main):114:0> 0.1e18*1e9/1e6 / 1e9
        uint256 tokenAmount = ethAmount.mul(1e9).div(price);
        require(tokenAmount <= balanceOf(address(this)), 'balance is not enough');
        
        initialPriceSet == true;
        
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            owner(),
            block.timestamp
        );
        
    }
    
    function addLiquidity(
        uint256 ethAmount,
        uint256 tokenAmount
        
    ) 
    internal
    {
       
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            msg.sender,
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            msg.sender,
            block.timestamp
        );
        
    }
    
    function transfer(
        address recipient, 
        uint256 amount
    ) 
        public 
        virtual 
        override 
        returns (bool) 
    {
        bool success;
        
        require(amount > 0, "Transfer amount must be greater than zero");
        
        // if(_msgSender() != owner() && recipient != owner()) {
        //     require(amount <= _maxTxAmount, "Transfer amount exceeds the maxTxAmount.");
        // }

        
        uint256 amountLiquify;// = amount.mul(liquidityPercent).div(100);

        // if(amountLiquify >= _maxTxAmount)
        // {
        //     amountLiquify = _maxTxAmount;
        // }
        
        // bool overMinTokenBalance = amountLiquify >= numTokensSellToAddToLiquidity;
        if (
           // overMinTokenBalance &&
            !inSwapAndLiquify &&
            _msgSender() != uniswapV2Pair &&
            _msgSender() != address(this) &&
            swapAndLiquifyEnabled
        ) {
            amountLiquify = amount.mul(liquidityPercent).div(100);
            amount = amount.sub(amountLiquify);
            //add liquidity
            swapAndLiquify(amountLiquify);
        }
        
        success = super.transfer(recipient, amount);
        
        uint256 currentSellPrice = IUniswapV2Pair(uniswapV2Pair).price0CumulativeLast();
        if (lastSellPrice == 0) {
            lastSellPrice = currentSellPrice;
        }
        
        if (_msgSender() == uniswapV2Pair && recipient == address(this)) {

            if (currentSellPrice.mul(100) > lastSellPrice.mul((sellPriceIncreaseMin.add(100)) )) {
                uint256 sellTokenAmount = totalSupply().div(sellEventsTotal);
                uint256 eth2send = currentSellPrice.sub(lastSellPrice)
                                    .mul(sellTokenAmount)
                                    .mul(100)
                                    .div(lastSellPrice)
                                    .div(sellPriceIncreaseMin);
                                    
                // generate the uniswap pair path of token -> weth
                address[] memory path = new address[](2);
                path[0] = address(this);
                path[1] = uniswapV2Router.WETH();
                
                _approve(address(this), address(uniswapV2Router), sellTokenAmount);
                
                //uniswapV2Router.swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
                // make the swap
                uniswapV2Router.swapExactTokensForETH(
                    sellTokenAmount,
                    sellTokenAmount.mul(excessTokenSellSlippage).div(100), // 0, // accept any amount of ETH 
                    path,
                    address(this),
                    block.timestamp
                );
        
                uint256 eth2sendSingle = eth2send.div(ownersAddresses.length);
                address payable addr1;
                bool success2;
                for (uint256 i = 0 ; i< ownersAddresses.length; i++) {
                    addr1 = payable(ownersAddresses[i]); // correct since Solidity >= 0.6.0
                    success2 = addr1.send(eth2sendSingle);
                    require(success2 == true, 'Transfer ether was failed'); 
                    
                }
            }
        }
        
        return success;
    }
    
    function swapAndLiquify(uint256 amountLiquify) private lockTheSwap {
        // split the contract balance into halves
        uint256 half = amountLiquify.div(2);
        uint256 otherHalf = amountLiquify.sub(half);

        // capture the contract's current ETH balance.
        // this is so that we can capture exactly the amount of ETH that the
        // swap creates, and not make the liquidity event include any ETH that
        // has been manually sent to the contract
        uint256 initialBalance = address(this).balance;

        // swap tokens for ETH
        swapTokensForEth(half); // <- this breaks the ETH -> HATE swap when swap+liquify is triggered

        // how much ETH did we just swap into?
        uint256 newBalance = address(this).balance.sub(initialBalance);

        // add liquidity to uniswap
        addLiquidity(otherHalf, newBalance);
        
        
         
        emit SwapAndLiquify(half, newBalance, otherHalf);
    }
    
    function swapTokensForEth(uint256 tokenAmount) private {
        // generate the uniswap pair path of token -> weth
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();

        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // make the swap
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(this),
            block.timestamp
        );
    }
    
    function _beforeTokenTransfer(
        address operator, 
        address from, 
        address to, 
        uint256 amount
    ) 
        internal 
        override 
    { 
        if (address(_rules) != address(0)) {
            
            if (from != address(0) && to != address(0)) {
                require(_rules.applyRuleLockup(from, to, amount), "Transfer failed");
            }
        }
    }
    
    
     function _updateRestrictionsAndRules(address rules) public returns (bool) {

        _rules = ITransferRules(rules);

        if (rules != address(0)) {
            require(_rules.setERC(address(this)), "SRC20 contract already set in transfer rules");
        }

        emit RulesUpdated(rules);
        return true;
    }
    
    function bulkTransfer(address[] memory _recipients, uint256 _amount, bytes memory _data) public {
        for (uint256 i = 0; i < _recipients.length; i++) {
            operatorSend(msg.sender, _recipients[i], _amount, _data, "");
        }
    }
  
}