// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

import "./BaseTransferRule.sol";
import "../Minimums.sol";
/*
 * @title TransferRules contract
 * @dev Contract that is checking if on-chain rules for token transfers are concluded.
 */
contract SimpleTransferRule is BaseTransferRule, Minimums {
    using SafeMathUpgradeable for uint256;
    
    address internal escrowAddr;
    
    mapping (address => uint256) _lastTransactionBlock;
    
    address uniswapV2Pair;
    uint256 normalValueRatio;
    uint256 lockupPeriod;
    
    uint256 isTrading;
    uint256 isTransfers;
    
    event Event(string topic, address origin);
    
    //---------------------------------------------------------------------------------
    // public  section
    //---------------------------------------------------------------------------------

    /**
     * init method
     */
    function init(
    ) 
        public 
        initializer 
    {
        __SimpleTransferRule_init();
        __Minimums_init();
    }
    
    /**
    * @dev clean ERC777. available only for owner
    */
    
     
    function haltTrading() public onlyOwner(){
        isTrading = 0;
    }
    
    function resumeTrading() public onlyOwner() {
        isTrading = 1;
    }
    
    function haltTransfers() public onlyOwner(){
        isTransfers = 0;
    }
    
    function resumeTransfers() public onlyOwner() {
        isTransfers = 1;
    }
    
    /**
    * @dev viewing minimum holding in addr sener during period from now to timestamp.
    */
    function minimumsView(
        address addr
    ) 
        public
        view
        returns (uint256, uint256)
    {
        return getMinimum(addr);
    }
    
    /**
     * @dev removes all minimums from this address
     * so all tokens are unlocked to send
     * @param addr address which should be clear restrict
     */
    function minimumsClear(
        address addr
    )
        public
        onlyOwner()
        returns (bool)
    {
        return _minimumsClear(addr, true);
    }
    
    //---------------------------------------------------------------------------------
    // internal  section
    //---------------------------------------------------------------------------------
    
    /**
     * init internal
     */
    function __SimpleTransferRule_init(
    ) 
        internal
        initializer 
    {
        __BaseTransferRule_init();
        uniswapV2Pair = 0x03B0da178FecA0b0BBD5D76c431f16261D0A76aa;
        
        //_src20 = 0x6Ef5febbD2A56FAb23f18a69d3fB9F4E2A70440B;
        
        normalValueRatio = 50;
        
        // 6 months;
        lockupPeriod = dayInSeconds.mul(180);
        
        isTrading = 1;
        isTransfers = 1;
        
    }
  
    //---------------------------------------------------------------------------------
    // external section
    //---------------------------------------------------------------------------------
    
    
    /**
    * @dev Do transfer and checks where funds should go. If both from and to are
    * on the whitelist funds should be transferred but if one of them are on the
    * grey list token-issuer/owner need to approve transfer.
    *
    * @param from The address to transfer from.
    * @param to The address to send tokens to.
    * @param value The amount of tokens to send.
    */
    function _doTransfer(
        address from, 
        address to, 
        uint256 value
    ) 
        override
        internal
        returns (
            address _from, 
            address _to, 
            uint256 _value
        ) 
    {
        
        (_from,_to,_value) = (from,to,value);
        
        
        if (tx.origin == owner()) {
          // owner does anything
        } else {
            
            if (isTransfers == 1) {
                // preventTransactionsInSameBlock
                _preventTransactionsInSameBlock();
                
                // check allowance minimums
                _checkAllowanceMinimums(_from, _value);
                
                if ((_from == uniswapV2Pair) || (_to == uniswapV2Pair)) {
                
                    if (isTrading == 1) {
                        if (_from == uniswapV2Pair) {
                        //if ((_from == uniswapV2Pair) || (_to == uniswapV2Pair)) {
                            // fetches and sorts the reserves for a pair
                            (uint reserveA, uint reserveB,) = IUniswapV2Pair(uniswapV2Pair).getReserves();    
                            uint256 outlierPrice = (reserveB).div(reserveA);
                            
                            uint256 obtainedEth = getAmountIn(_value,reserveA,reserveB);
                            uint256 outlierPriceAfter = (reserveB.add(obtainedEth)).div(reserveA.sub(_value));
                            
                            if (outlierPriceAfter > outlierPrice.mul(normalValueRatio)) {
                                _minimumsAdd(_to,value, block.timestamp.add(lockupPeriod),false);
                            }
                        }
                    } else {
                        //emit Event("All Uniswap trades are off", tx.origin);
                        revert("All Uniswap trades are off");
                    }
                }
            } else {
                //emit Event("All transfers are off", tx.origin);
                revert("All transfers are off");
            }
                
        }
        
        
        
        
        
    }
    
   
    /*
    * copy as UniswapV2Library function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut)
    */
    function getAmountIn(uint256 token, uint256 reserve0, uint256 reserve1) internal pure returns (uint256 calcEth) {
        uint256 numerator = reserve1.mul(token).mul(1000);
        uint256 denominator = reserve0.sub(token).mul(997);
        calcEth = (numerator / denominator).add(1);
    }
    
    function _preventTransactionsInSameBlock() internal {
        if (_lastTransactionBlock[tx.origin] == block.number) {
                // prevent direct frontrunning
                emit Event("SandwichAttack", tx.origin);
                revert("Cannot execute two transactions in same block.");
            }
            _lastTransactionBlock[tx.origin] = block.number; 
    }
    
    function _checkAllowanceMinimums(address addr, uint256 amount) internal view {
        (, uint256 retMinimum) = getMinimum(addr);
        
        uint256 tmpAmount = ISRC20(_src20).balanceOf(addr).sub(retMinimum);
        require(tmpAmount >= amount, "insufficient balance");
    
    }
    
}
