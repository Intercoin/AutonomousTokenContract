// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
//import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./interfaces/ITransferRules.sol";
import "./IntercoinTrait.sol";

import "./interfaces/ITradedTokenContract.sol";

contract Recipient {
    
}

contract TradedTokenContract is 
    // IUniswapV2Callee, 
    ITradedTokenContract, 
    ERC777Upgradeable, 
    OwnableUpgradeable, 
    IntercoinTrait, 
    IERC777RecipientUpgradeable, 
    ERC1820ImplementerUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    
    Recipient recipientSelf;
    
    using SafeMathUpgradeable for uint256;

    using FixedPoint for *;

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

    // stored Sell Price in binary fixed point 112*112
    //uint224 private lastSellPrice_Q112;
    FixedPoint.uq112x112 internal lastMaxSellPrice;
    FixedPoint.uq112x112 internal lastBuyPrice;
    
    bool initialPriceAlreadySet;
    
    // predefine owners addresses
    OwnersList[] ownersList;
    
    mapping (address => address) invitedBy;
    
    mapping (address => RecentStruct) recentTransfer;
    
    // Taxes
    TransferTax transferTax;
    ProgressiveTax progressiveTax;
    SellTax sellTax;
    BuyTax buyTax;
    
    modifier lockTheSwap {
        inSwapAndLiquify = true;
        _;
        inSwapAndLiquify = false;
    }
    
    modifier initialPriceSet() {
        require(initialPriceAlreadySet == false, "Initial price has already set");
        initialPriceAlreadySet = true;
        _;
    }
    
    //to recieve ETH from uniswapV2Router when swaping
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
    
    /*IERC777RecipientUpgradeable*/
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
   
    // function uniswapV2Call(
    //     address sender, 
    //     uint amount0, 
    //     uint amount1, 
    //     bytes calldata data
    // ) 
    //     external
    //     override
    // {
    //  //   require(1==0, 'Art::here');
    // }
    
    /**
     * initialize method
     * @param name token name
     * @param symbol token symbol
     * @param defaultOperators default operators
     * @param _predefinedBalances balances that can be predefined to some accounts and substructed from general totalSupply
     * @param _buyTax params that applied when contract will buyback own tokens from LP
     * @param _sellTax params that applied when contract will sell own tokens to LP
     * @param _transferTax params that applied when accounts transfer tokens to each others
     * @param _progressiveTax progressive taxes
     * @param _ownersList owners list
     */
    function initialize(
        string memory name, 
        string memory symbol, 
        address[] memory defaultOperators,
        BulkStruct[] memory _predefinedBalances,
        BuyTax memory _buyTax,
        SellTax memory _sellTax,
        TransferTax memory _transferTax,
        ProgressiveTax memory _progressiveTax,
        OwnersList[] memory _ownersList
    ) 
        public 
        virtual 
        override
        initializer 
    {

        // get Uniswap/Pancake contracts addresses
        (uniswapRouter, uniswapRouterFactory) = networkSettings();

        // init sub contracts
        __ReentrancyGuard_init();
        __Ownable_init();

       __ERC777_init(name, symbol, defaultOperators);

        __ERC1820Implementer_init();
        
        // erc1820
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
        //_ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC777TokensSender"), address(this));

        uint256 totalSupply = 1_000_000_000 * 10 ** 18;
        uint256 tokensLeft = totalSupply;
        lastMaxSellPrice._x = 0;
        
        // predefine balances
        for (uint256 i = 0; i < _predefinedBalances.length; i++) {
            _mint(_predefinedBalances[i].recipient, _predefinedBalances[i].amount, "", "");
            tokensLeft= tokensLeft.sub(_predefinedBalances[i].amount);
            
        }
        
        // mint the rest to this contract 
        _mint(address(this), tokensLeft, "", "");
        
        //
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(uniswapRouter);
        
         // Create a uniswap pair for this new token
        uniswapV2Pair = IUniswapV2Factory(uniswapRouterFactory)
            .createPair(address(this), _uniswapV2Router.WETH());

        // set the rest of the contract variables
        uniswapV2Router = _uniswapV2Router;
    
        // adjust buy/sell/transfer/progressive taxes
        buyTax.percentOfTokenAmount = (_buyTax.percentOfTokenAmount == 0 ) ? 0 : _buyTax.percentOfTokenAmount; // token percent of LP to be buy;
        buyTax.priceDecreaseMin = (_buyTax.priceDecreaseMin == 0 ) ? 10 : _buyTax.priceDecreaseMin; // 10%
        buyTax.slippage = (_buyTax.slippage == 0 ) ? 10 : _buyTax.slippage; //10%
        buyTax.percentOfSellPrice = _buyTax.percentOfSellPrice;
        
        sellTax.percentOfTokenAmount = (_sellTax.percentOfTokenAmount == 0 ) ? 0 : _sellTax.percentOfTokenAmount; // token percent of LP to be sell;
        sellTax.priceIncreaseMin = (_sellTax.priceIncreaseMin == 0 ) ? 10 : _sellTax.priceIncreaseMin; // 10%
        sellTax.slippage = (_sellTax.slippage == 0 ) ? 10 : _sellTax.slippage; //10%
        
        transferTax.total = (_transferTax.total == 0 ) ? 0 : _transferTax.total; // default 0 percent;
        transferTax.toLiquidity = (_transferTax.toLiquidity == 0 ) ? 10 : _transferTax.toLiquidity; // default 10 percent;
        transferTax.toBurn = (_transferTax.toBurn == 0 ) ? 0 : _transferTax.toBurn; // default 10 percent;
        
        progressiveTax.from = (_progressiveTax.from == 0 ) ? 5 : _progressiveTax.from; // default 5 percent
        progressiveTax.to = (_progressiveTax.to == 0 ) ? 100 : _progressiveTax.to; // default 100 percent
        progressiveTax.duration = (_progressiveTax.duration == 0 ) ? 3600 : _progressiveTax.duration; // default 3600 seconds;
        
        // proportions (array of percentages which must add up to 100)
        uint256 p = 0;
        for (uint256 i=0; i<_ownersList.length; i++) {
            ownersList.push(_ownersList[i]);
            p = p.add(_ownersList[i].percent);
        }
        require(p == 100, "overall percents for `_ownersList` must equal 100");
        
        
        bytes memory bytecode = type(Recipient).creationCode;
        Recipient _recipient;
        bytes32 salt = keccak256(abi.encodePacked(address(uniswapV2Pair)));
        assembly {
            _recipient := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        recipientSelf = _recipient;

    }
    
    /**
     * @param price initial price 1 eth token mul by 1e9
     * called only once
     */
    function setInitialPrice(
        uint256 price
    ) 
        public 
        onlyOwner 
        initialPriceSet()
    {
        uint256 ethAmount = address(this).balance;
        require(ethAmount != 0, 'balance is empty');
        
        //eth/price*1e9/1e18/1e9
        //uint256 tokenAmount = ethAmount.mul(price).div(1e9);
        //irb(main):114:0> 0.1e18*1e9/1e6 / 1e9
        uint256 tokenAmount = ethAmount.mul(1e9).div(price);
        require(tokenAmount <= balanceOf(address(this)), 'balance is not enough');
        
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        
        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            address(this),
            block.timestamp
        );
        
        // set 
        //  initial sell price are currentSellPrice + currentSellPrice*sellTax.priceIncreaseMin/100
        //  initial buy price are currentSellPrice - currentSellPrice*percentOfSellPrice/100
        FixedPoint.uq112x112 memory fractionPercent;
        
        
        CurrentPrices memory currentPrices;
        
        (currentPrices,) = _currentPrices();
        fractionPercent = (currentPrices.sell).muluq(FixedPoint.fraction(uint112(sellTax.priceIncreaseMin), uint112(100)));
        lastMaxSellPrice._x = currentPrices.sell._x + fractionPercent._x;
        
        fractionPercent = lastMaxSellPrice.muluq(FixedPoint.fraction(uint112(buyTax.percentOfSellPrice), uint112(100)));
        lastBuyPrice._x = lastMaxSellPrice._x - fractionPercent._x;

    }

    /**
     * set restriction for every transfer
     * @param rules address of TransferRules contract
     * @return bool
     */
    function _updateRestrictionsAndRules(
        address rules
    ) 
        public 
        onlyOwner
        returns (bool) 
    {

        _rules = ITransferRules(rules);

        if (rules != address(0)) {
            require(_rules.setERC(address(this)), "ERC777 contract already set in transfer rules");
        }

        emit RulesUpdated(rules);
        return true;
    }
    
    /**
     * @param _bulkStruct array of tuples [recipient, address]
     * @param _data bytes to operatorSend
     */
    function bulkTransfer(
        BulkStruct[] memory _bulkStruct, 
        bytes memory _data
    ) 
        public 
    {
        for (uint256 i = 0; i < _bulkStruct.length; i++) {
            operatorSend(msg.sender, _bulkStruct[i].recipient, _bulkStruct[i].amount, _data, "");
        }
    }
 
    /**
     * ERC777-transfer overroded
     */
    function transfer(
        address recipient, 
        uint256 amount
    ) 
        public 
        virtual 
        override
        nonReentrant
        returns (bool) 
    {

        // setup invitedBy
        setInvitedBy(recipient, _msgSender());
        
        // amount can be reduced by taxes 
        amount = correctTaxes(recipient, amount);
        
        //### then common ERC777-transfer
        
        if (recipient == address(recipientSelf)) {
            recipient = address(this);
        }
        
        
        bool success = super.transfer(recipient, amount);
        
        if (_msgSender() == uniswapV2Pair) {
            
            
            
            bool shouldSell;
            (shouldSell,,,) = __shouldSell();
            if (shouldSell == true) {
                emit ShouldSell();
            }
        
        }
        
        return success;
        
    }

    /**
     * ERC777-transferFrom overroded
     */
    function transferFrom(
        address holder, 
        address recipient, 
        uint256 amount
    ) 
        public 
        override 
        returns (bool) 
    {
   
        // setup invitedBy
        setInvitedBy(recipient, _msgSender());
        
        // amount can be reduced by taxes 
        amount = correctTaxes(recipient, amount);
        
        bool success = super.transferFrom(holder, recipient, amount);
        
        if (recipient == uniswapV2Pair) {
            bool shouldBuy;
            (shouldBuy,,,) = __shouldBuy();
            if (shouldBuy == true) {
                emit ShouldBuy();
            }
        }
        
        return success;
        
    }

    /**
     * method that called by third-party app to smooth out buy and sell prices
     */
   
    
    
    function sell() public {
        sellTokenToLP();
    }
    function buy() public {
        buyTokenFromLP();
    }

    /**
     * getting current prices for pair token and eth
     * 
     */
    function _currentPrices(
    ) 
        internal 
        view
        returns(
            CurrentPrices memory _currentPrices,
            CurrentReserves memory _currentReserves
    ) {
        uint112 reserve0;
        uint112 reserve1;
        (reserve0, reserve1, ) = IUniswapV2Pair(uniswapV2Pair).getReserves();
        if (reserve0 == 0 || reserve1 == 0) {
            // Exclude case when reserves are empty
        } else {
            
            if (uniswapV2Router.WETH() == IUniswapV2Pair(uniswapV2Pair).token0()) {
                _currentPrices.sell = FixedPoint.fraction(reserve0,reserve1);
                _currentPrices.buy = FixedPoint.fraction(reserve1,reserve0);
                _currentReserves.eth = reserve0;
                _currentReserves.token = reserve1;
            } else {
                _currentPrices.sell = FixedPoint.fraction(reserve1,reserve0);
                _currentPrices.buy = FixedPoint.fraction(reserve0,reserve1);
                _currentReserves.eth = reserve1;
                _currentReserves.token = reserve0;
            }
        
        }
    }
    
    /**
     * fill invitedBy mapping
     * @param invited person been invited
     * @param inviter person who invited
     * 
     */
    function setInvitedBy(
        address invited, 
        address inviter
    ) 
        internal 
    {
        if (invitedBy[invited] == address(0)) {
            invitedBy[invited] = inviter;
        }
    }
    

  
    /**
     * return addresses for uniswap/pancake router and factory
     * @dev note that (uniswapV2Router).factory() also get factory's address but crashed in bsc testnet, so we hardcoded it
     */
    function networkSettings(
    ) 
        internal
        view
        virtual
        returns(
            address _uniswapRouter, 
            address _uniswapRouterFactory
        ) 
    {
        if (block.chainid == 1 || block.chainid == 3 || block.chainid == 4) {
            // Ethereum all networks
            _uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
            _uniswapRouterFactory = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
        } else if (block.chainid == 56) {
            // BSC MainNet
            _uniswapRouter = 0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F;
            _uniswapRouterFactory = 0xBCfCcbde45cE874adCB698cC183deBcF17952812;
        } else if (block.chainid == 97) {
            // BSC TestNet
            _uniswapRouter = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
            _uniswapRouterFactory = 0x6725F303b657a9451d8BA641348b6761A6CC7a17;
        } else {
            revert("Chain does not supported");
        }
    }
    
    /**
     * added liquidity 
     * @param ethAmount amount in ETH
     * @param tokenAmount amount in tokens
     */
    function addLiquidity(
        uint256 ethAmount,
        uint256 tokenAmount
    ) 
        internal
    {
       
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        (,, uint256 lpTokens) = uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            address(this),
            block.timestamp
        );
        

        // IUniswapV2Pair(uniswapV2Pair).burn(address(0));
        if (transferTax.toBurn > 0) {
            IUniswapV2Pair(uniswapV2Pair).transfer(address(0), lpTokens.mul(transferTax.toBurn).div(100));
        }
        
        uint256 lpToSend = lpTokens.sub(lpTokens.mul(transferTax.toBurn).div(100));

        for (uint256 i = 0 ; i< ownersList.length; i++) {
            IUniswapV2Pair(uniswapV2Pair).transfer(ownersList[i].addr, lpToSend.mul(ownersList[i].percent).div(100));
        }

    }
    
    
     
    /**
     * @param recipient recipient's address
     * @param amount amount that can be reduced by taxes
     */
    function correctTaxes(
        address recipient,
        uint256 amount
    ) 
        internal 
        returns(uint256)
    {
        require(amount > 0, "Transfer amount must be greater than zero");
        
        
        //### calculate taxes)
        // tax calculated through multiple by TransferTax.toLiquidity 
        uint256 taxLiquidityAmount;
        // tax calculated through multiple by TransferTax.toBurn 
        uint256 taxBurnAmount;
        // bonus to inviter
        uint256 inviterBonusAmount;

        (
            taxLiquidityAmount, 
            taxBurnAmount, 
            inviterBonusAmount
        ) = taxCalculation(recipient, amount);
        
        uint256 totalTaxes = taxLiquidityAmount.add(taxBurnAmount).add(inviterBonusAmount);

        require(amount > (totalTaxes), "Transfer amount left after taxes applied must be greater than zero");
        
        amount = amount.sub(totalTaxes);
        
        //### then make swap (taxLiquidityAmount)

        if (
            taxLiquidityAmount > 0 &&
            !inSwapAndLiquify &&
            _msgSender() != uniswapV2Pair &&
            _msgSender() != address(this) &&
            swapAndLiquifyEnabled
        ) {
            swapAndLiquify(taxLiquidityAmount);
        }
        
        //### then burn taxBurnAmount
        if (taxBurnAmount > 0) {
            _burn(_msgSender(),taxBurnAmount, "", "");
        }
        
        //### then send to inviter some bonus(inviterBonusAmount)
        if (inviterBonusAmount>0) {
            super.transfer(invitedBy[recipient], inviterBonusAmount);
            emit SentBonusToInviter(invitedBy[recipient], inviterBonusAmount);
        }
        
        return amount;
    }
        
    /**
     * calculate taxes from amount
     * @param recipient recipient's address
     * @param amount amount of tokens
     * @return taxLiquidity liquidity tax
     * @return taxBurn burn tax
     * @return inviterBonus bonus to inviter
     */
    function taxCalculation(
        address recipient,
        uint256 amount
    ) 
        internal
        returns(
            uint256 taxLiquidity, 
            uint256 taxBurn, 
            uint256 inviterBonus
        ) 
    {
        
        if (
            transferTax.total == 0 ||
            (
                _msgSender() != uniswapV2Pair &&
                _msgSender() != address(this) &&
                recipient != uniswapV2Pair &&
                recipient != address(this)
            )
        ) {
            taxLiquidity = 0;
            taxBurn = 0;
            inviterBonus = 0;
        } else {
            if (_msgSender() == address(this) || recipient == uniswapV2Pair) {
                taxLiquidity = 0;
                taxBurn = 0;
                inviterBonus = 0;
            } else {
                
                
                // calculate progressive task 
                if (block.timestamp > (recentTransfer[_msgSender()].exists ? recentTransfer[_msgSender()].timestamp : 0).add(progressiveTax.duration)) {
                    recentTransfer[_msgSender()].timestamp = block.timestamp;
                    recentTransfer[_msgSender()].balance = balanceOf(_msgSender());
                    recentTransfer[_msgSender()].sentPercent = 0;
                }
                
                uint256 sp = recentTransfer[_msgSender()].sentPercent;
                uint256 pt = progressiveTax.to;
                uint256 pf = progressiveTax.from;
                
                uint256 p = recentTransfer[_msgSender()].sentPercent.add(amount.mul(100).div(recentTransfer[_msgSender()].balance));
                
                uint256 taxP = p < pf ? 0 : (p.add(sp)).div(2).sub(pf).div(pt.sub(pf)).mul(transferTax.total);
                recentTransfer[_msgSender()].sentPercent = p;
                
                // 
                uint256 transferTaxAmount = amount.mul(taxP).div(100);
                
                if (recipient == address(this)) {
                    // no taxLiquidity and taxBurn
                } else {
                    taxLiquidity = transferTaxAmount.mul(transferTax.toLiquidity).div(100);
                
                    taxBurn =  transferTaxAmount.mul(transferTax.toBurn).div(100);
                    
                    inviterBonus = transferTaxAmount.sub(taxLiquidity).sub(taxBurn);
                    if (invitedBy[recipient] == address(0)) {
                        inviterBonus = 0;
                        taxBurn = taxBurn.add(inviterBonus);
                    }
                }
            }
        }
      
    }
    
    /**
     * @dev Hook that is called before any token transfer. This includes
     * calls to {send}, {transfer}, {operatorSend}, minting and burning.
     * 
     */
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
    
    /**
     * buy back tokens from LP
     */
    function buyTokenFromLP(
    ) 
        internal 
    {
        bool success;
        SyncAmounts memory syncAmounts;
        //CurrentPrices memory currentPrices;
            
        (success, syncAmounts,) = _shouldBuy();
        
        if (success == true && syncAmounts.token > 0 && syncAmounts.eth > 0) {

            // generate the uniswap pair path of weth -> token
            address[] memory path = new address[](2);
            path[0] = uniswapV2Router.WETH();
            path[1] = address(this);
            
            // spend eth to tokens
            uniswapV2Router.swapETHForExactTokens{value: syncAmounts.eth}(
                syncAmounts.token,
                path,
                address(recipientSelf),//address(this),
                
                block.timestamp
            );
            
            emit ContractBuyBackTokens(syncAmounts.token, syncAmounts.eth);
            
             // update buyPrice
            FixedPoint.uq112x112 memory fractionPercent = lastBuyPrice.muluq(FixedPoint.fraction(uint112(buyTax.priceDecreaseMin), uint112(100)));
            lastBuyPrice._x = lastBuyPrice._x - fractionPercent._x;
        }
    }
    
    /**
     * sell tokens to LP
     */
    function sellTokenToLP(
    ) 
        internal  
    {

        // (
        //     uint256 tokensShouldToSell,
        //     uint256 ethWouldToObtain,
        //     FixedPoint.uq112x112 memory currentSellPrice, 
        //     FixedPoint.uq112x112 memory currentBuyPrice
        // ) = _shouldSell();
        bool success;
        SyncAmounts memory syncAmounts;
        CurrentPrices memory currentPrices;
        (success, syncAmounts, currentPrices) = _shouldSell();
        
        if (success == true && syncAmounts.token > 0 && syncAmounts.eth > 0) {
        //if (tokensShouldToSell > 0 && currentSellPrice._x > 0 && currentBuyPrice._x > 0 && ethWouldToObtain > 0) {

            // generate the uniswap pair path of token -> weth
            address[] memory path = new address[](2);
            path[0] = address(this);
            path[1] = uniswapV2Router.WETH();

            _approve(address(this), address(uniswapV2Router), syncAmounts.token);
            
            // make the swap
            uint256[] memory amounts = uniswapV2Router.swapExactTokensForETH(
            
                syncAmounts.token,
                syncAmounts.eth, //0, // accept any amount of ETH
                //
                path,
                address(this),
                block.timestamp
            );


            uint256 amountReceived = amounts[amounts.length-1];
            emit ContractSellTokens(syncAmounts.token, amountReceived);
            
            uint256 amountToken0 = amountReceived.mul(transferTax.toLiquidity).div(100);
            uint256 amountToken1 = uint256(FixedPoint.decode144(FixedPoint.mul(currentPrices.sell, amountToken0)));
            
            ///-----
            if (balanceOf(address(this)) >= amountToken1 && address(this).balance > amountToken0) {
                //            eth           token
                addLiquidity(amountToken0, amountToken1);
                
                uint256 eth2send = amountReceived.sub(amountToken0);

                address payable addr1;
                bool success2;
                uint256 fundsToSend;
                for (uint256 i = 0 ; i< ownersList.length; i++) {
                    addr1 = payable(ownersList[i].addr); // correct since Solidity >= 0.6.0
                    fundsToSend = eth2send.mul(ownersList[i].percent).div(100);
                    (success2, ) = addr1.call{value: fundsToSend}("");
                    // success2 = addr1.send(eth2send.mul(100).div(ownersList[i].percent));
                    require(success2 == true, 'Transfer ether was failed'); 
                    emit SentFundToOwner(ownersList[i].addr, fundsToSend);
                }


            }
            
            
            // update lastMaxSellPrice and buy price
            FixedPoint.uq112x112 memory fractionPercent;
            
            // fractionPercent = lastMaxSellPrice.muluq(FixedPoint.fraction(uint112(sellTax.priceIncreaseMin), uint112(100)));
            // lastMaxSellPrice._x = lastMaxSellPrice._x + fractionPercent._x;
            fractionPercent = currentPrices.sell.muluq(FixedPoint.fraction(uint112(sellTax.priceIncreaseMin), uint112(100)));
            lastMaxSellPrice._x = currentPrices.sell._x + fractionPercent._x;
              
            fractionPercent = lastMaxSellPrice.muluq(FixedPoint.fraction(uint112(buyTax.percentOfSellPrice), uint112(100)));
            lastBuyPrice._x = lastMaxSellPrice._x - fractionPercent._x;

        }

    }
    
   
    function __shouldSell(
    ) 
        internal 
        view
        returns(
            bool success,
            NeedToEmitEvent eventState,
            SyncAmounts memory syncAmounts,
            CurrentPrices memory currentPrices
        )
    {
        eventState = NeedToEmitEvent.Unknown;
        success = false;
        
         // get sell/buy prices
         
        CurrentReserves memory currentReserves;
        
        (currentPrices, currentReserves) = _currentPrices();
        
        syncAmounts.token = 0;
        syncAmounts.eth = 0;
        
        if (currentReserves.token == 0 || currentReserves.eth == 0) {
            
            // Exclude case when reserves are empty
            eventState = NeedToEmitEvent.NoAvailableReserves;
            
        } else if (currentPrices.sell._x > lastMaxSellPrice._x) {

            uint256 sellTokenAmount = (currentReserves.token).mul(sellTax.percentOfTokenAmount).div(100);
            
            if (sellTokenAmount > 0) {
                
                address[] memory path = new address[](2);
                path[0] = address(this);
                path[1] = uniswapV2Router.WETH();

                // calculating eth amount to get optimal token amounts before calling swap.
 
                // uint256[] memory amounts = uniswapV2Router.getAmountsOut(sellTokenAmount, path);
                // uint256 _amountEth = amounts[amounts.length-1];
                
                uint256 _amountEth = uniswapV2Router.getAmountOut(sellTokenAmount, currentReserves.token, currentReserves.eth);
            
                _amountEth = _amountEth.sub(_amountEth.mul(sellTax.slippage).div(100));
                
                if (balanceOf(address(this)) >= sellTokenAmount) {
                    
                    if (_amountEth < currentReserves.eth && _amountEth > 0) {
                        syncAmounts.token = sellTokenAmount;
                        syncAmounts.eth = _amountEth;
                        
                        
                        
                        eventState = NeedToEmitEvent.None;
                        success = true;
                        
                    } else {
                        eventState = NeedToEmitEvent.NoAvailableReserveETH;
                    }
                } else {
                    eventState = NeedToEmitEvent.NotEnoughTokenToSell;
                }
                
            } 
            
        }
    }
    
    /**
     * calculating how much tokens contract should to sell 
     * and making simple validation before
     */
    function _shouldSell(
    ) 
        internal 
        returns(
            bool success,
            SyncAmounts memory syncAmounts,
            CurrentPrices memory currentPrices
        )
    {
        
        
        NeedToEmitEvent eventState;

        (success, eventState, syncAmounts, currentPrices) = __shouldSell();
        
        if (success == true) {
            // all ok
            
        } else {
            if (eventState == NeedToEmitEvent.NoAvailableReserves) {
                emit NoAvailableReserves();
            } else if (eventState == NeedToEmitEvent.NoAvailableReserveETH) {
                emit NoAvailableReserveETH();
            } else if (eventState == NeedToEmitEvent.NotEnoughTokenToSell) {
                emit NotEnoughTokenToSell(syncAmounts.token);
            }
        }
        // get sell/buy prices
        
    }
    
    
    function __shouldBuy(
    ) 
        internal 
        view
        returns(
            bool success,
            NeedToEmitEvent eventState,
            SyncAmounts memory syncAmounts,
            CurrentPrices memory currentPrices
        )
    {
        eventState = NeedToEmitEvent.Unknown;
        success = false;
        
        CurrentReserves memory currentReserves;
        
        syncAmounts.token = 0;
        syncAmounts.eth = 0;
        
        
        // if buy.percentOfSellPrice = 0 then it wouldn't buy back.
        if (buyTax.percentOfSellPrice > 0) {
            
            (currentPrices, currentReserves) = _currentPrices();
            
            if (currentReserves.token == 0 || currentReserves.eth == 0) {
            
                // Exclude case when reserves are empty
                eventState = NeedToEmitEvent.NoAvailableReserves;
            
            } else if (currentPrices.sell._x < lastBuyPrice._x) {
                
                syncAmounts.token = currentReserves.token.mul(buyTax.percentOfTokenAmount).div(100);
                
                // generate the uniswap pair path of weth -> token
                address[] memory path = new address[](2);
                path[0] = uniswapV2Router.WETH();
                path[1] = address(this);
    
                // calculating eth amount to get optimal token amounts before calling swap.
                uint256[] memory amounts = uniswapV2Router.getAmountsIn(syncAmounts.token, path);
                syncAmounts.eth = amounts[0];
                
                if ((address(this).balance) > syncAmounts.eth && syncAmounts.eth > 0) {
                    // all ok
                    
                    eventState = NeedToEmitEvent.None;
                    success = true;
                } else {
                    eventState = NeedToEmitEvent.NotEnoughETHToBuyTokens;
                }
            
            }
            
        }
    }
    /**
     * calculating how much tokens contract should to buy back
     */
    function _shouldBuy(
    ) 
        internal 
        returns(
            bool success,
            SyncAmounts memory syncAmounts,
            CurrentPrices memory currentPrices
            // uint256 amount,
            // uint256 amountEth,
            // FixedPoint.uq112x112 memory _currentSellPrice, 
            // FixedPoint.uq112x112 memory _currentBuyPrice
        )
    {
        NeedToEmitEvent eventState;

        (success, eventState, syncAmounts, currentPrices) = __shouldBuy();
        
        if (success == true) {
            // all ok
                    
        } else {
            if (eventState == NeedToEmitEvent.NoAvailableReserves) {
                emit NoAvailableReserves();
            } else if (eventState == NeedToEmitEvent.NoAvailableReserveETH) {
                emit NoAvailableReserveETH();
            } else if (eventState == NeedToEmitEvent.NotEnoughTokenToSell) {
                emit NotEnoughTokenToSell(syncAmounts.token);
            } else if (eventState == NeedToEmitEvent.NotEnoughETHToBuyTokens) {
                emit NotEnoughETHToBuyTokens(syncAmounts.eth);
            }
        }
    }

    function triggerEvents(
        NeedToEmitEvent eventState,
        SyncAmounts memory syncAmounts
    ) 
        private
    {
        if (eventState == NeedToEmitEvent.NoAvailableReserves) {
            emit NoAvailableReserves();
        } else if (eventState == NeedToEmitEvent.NoAvailableReserveETH) {
            emit NoAvailableReserveETH();
        } else if (eventState == NeedToEmitEvent.NotEnoughTokenToSell) {
            emit NotEnoughTokenToSell(syncAmounts.token);
        } else if (eventState == NeedToEmitEvent.NotEnoughETHToBuyTokens) {
            emit NotEnoughETHToBuyTokens(syncAmounts.eth);
        }
    }
    
    
    /**
     * @param amountLiquify amountLiquify
     */
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
    
    /**
     * @param tokenAmount token's amount
     */
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
   
}