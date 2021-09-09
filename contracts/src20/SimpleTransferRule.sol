// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
//import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "./BaseTransferRule.sol";
//import "../Minimums.sol";

/*
 * @title TransferRules contract
 * @dev Contract that is checking if on-chain rules for token transfers are concluded.
 */
contract SimpleTransferRule is BaseTransferRule {
    using SafeMathUpgradeable for uint256;
    //using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    address internal escrowAddr;
    
    mapping (address => uint256) _lastTransactionBlock;
    
    //address uniswapV2Pair;
    address[] uniswapV2Pairs;
    uint256 normalValueRatio;
    uint256 lockupPeriod;
    uint256 dayInSeconds;
    
    uint256 isTrading;
    uint256 isTransfers;
    
    struct Minimum {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        bool gradual;
    }

    mapping(address => Minimum[]) _minimums;
         
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
    
    function pairsAdd(address pair) public onlyOwner() {
        
        uniswapV2Pairs.push(pair);
    }
    
    function pairsList() public view returns(address[] memory) {
         return uniswapV2Pairs;
    }
    /**
    * @dev viewing minimum holding in addr sener during period from now to timestamp.
    */
    function minimumsView(
        address addr
    ) 
        public
        view
        returns (uint256)
    {
        return _minimumsGet(addr, block.timestamp);
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
        //uniswapV2Pair = 0x03B0da178FecA0b0BBD5D76c431f16261D0A76aa;
        uniswapV2Pairs.push(0x03B0da178FecA0b0BBD5D76c431f16261D0A76aa);
        
        _src20 = 0x6Ef5febbD2A56FAb23f18a69d3fB9F4E2A70440B;
        
        normalValueRatio = 50;
        
        // 6 months;
        dayInSeconds = 86400;
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
        
        // owner does anything
        
        if (tx.origin == owner()) {
            return  (_from,_to,_value);
        }
            
        string memory errmsg;
        
        if (isTransfers == 0) {
            errmsg = "Transfers have been temporarily halted";
            emit Event(errmsg, tx.origin);
            revert(errmsg);
        }
            
        // preventTransactionsInSameBlock
        _preventTransactionsInSameBlock();
        
        // check allowance minimums
        _checkAllowanceMinimums(_from, _value);

        if ((indexOf(uniswapV2Pairs,_from) != -1) && (indexOf(uniswapV2Pairs,_to) != -1)) {
            return  (_from,_to,_value);
        }
            
        if (isTrading == 0) {
            errmsg = "Trading has been temporarily halted";
            emit Event(errmsg, tx.origin);
            revert(errmsg);
        }
        

        if (indexOf(uniswapV2Pairs,_from) != -1) {
            address uniswapV2Pair = _from;
        
            // fetches and sorts the reserves for a pair
            (uint reserveA, uint reserveB) = getReserves(uniswapV2Pair);
            uint256 outlierPrice = (reserveB).div(reserveA);
            
            uint256 obtainedTokenB = getAmountIn(_value,reserveA,reserveB);
            uint256 outlierPriceAfter = (reserveB.add(obtainedTokenB)).div(reserveA.sub(_value));
            
            if (outlierPriceAfter > outlierPrice.mul(normalValueRatio)) {
                _minimumsAdd(_to,value, lockupPeriod, true);
            }
        }
         
    }
    
    function indexOf(address[] memory arr, address item) internal view returns(int32) {
        
        for(uint32 i = 0; i < arr.length; i++) {
            if (arr[i] == item) {
                return int32(i);
            }
        }
        
        return -1;
    }
    /*
    * copy as UniswapV2Library function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut)
    */
    function getAmountIn(uint256 token, uint256 reserve0, uint256 reserve1) internal pure returns (uint256 calcEth) {
        uint256 numerator = reserve1.mul(token).mul(1000);
        uint256 denominator = reserve0.sub(token).mul(997);
        calcEth = (numerator / denominator).add(1);
    }
    
    // reserveA is reserves of src20
    function getReserves(address uniswapV2Pair) internal returns (uint256 reserveA, uint256 reserveB) {
        (reserveA, reserveB,) = IUniswapV2Pair(uniswapV2Pair).getReserves();   
        (reserveA, reserveB) = (_src20 == IUniswapV2Pair(uniswapV2Pair).token0()) ? (reserveA, reserveB) : (reserveB, reserveA);
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
        uint256 minimum = _minimumsGet(addr, block.timestamp);
       
        uint256 canBeTransferring = ISRC20(_src20).balanceOf(addr).sub(minimum);
        require(canBeTransferring >= amount, "insufficient balance to maintain minimum lockup");
        
    }
    
    /**
     *  amount to lock up
     */
    function _minimumsAdd(
        address addr,
        uint256 amount,
        uint256 duration,
        bool gradual
    ) 
        internal
    {
        
        
        Minimum memory minimum = Minimum({
              amount: amount,
              startTime: block.timestamp,
              endTime: block.timestamp.add(duration),
              gradual: gradual
        });
        _minimums[addr].push(minimum);
    }
      
    /**
     * amount that locked up for `addr` in `currentTime`
     */
    function _minimumsGet(
        address addr,
        uint256 currentTime
    ) 
        internal 
        view
        returns (uint256) 
    {
         
        uint256 minimum = 0;
        uint256 c = _minimums[addr].length;
        uint256 m;
        
        for (uint256 i=0; i<c; i++) {
            if (
                _minimums[addr][i].startTime > currentTime || 
                _minimums[addr][i].endTime < currentTime 
                ) {
                continue;
            }
            
            m = _minimums[addr][i].amount;
            if (_minimums[addr][i].gradual) {
                m = m.mul(_minimums[addr][i].endTime.sub(currentTime)).div(_minimums[addr][i].endTime.sub(_minimums[addr][i].startTime));
            }
            minimum = minimum.add(m);
        }
        return minimum;
    }
    
}

