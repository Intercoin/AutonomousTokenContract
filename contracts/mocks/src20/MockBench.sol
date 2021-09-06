// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

import "../../src20/SimpleTransferRule.sol";
import "../../Minimums.sol";

contract T1 is SimpleTransferRule {
    
    using SafeMathUpgradeable for uint256;
    
    function tAdd() public {
        _minimumsAdd(address(this),100, 100,true);
    }
    function tAddTimes() public {
        for(uint256 i = 0; i < 100; i++){
            _minimumsAdd(address(this),100, 1,true);
        }
    }
    function tGet() public view returns(uint256) {
        return minimumsView(address(this));
    }
    function tCheck() public view {
        uint256 amount = 50;
        uint256 minimum = _minimumsGet(address(this), block.timestamp);
           
        uint256 canBeTransferring = (uint256(100)).sub(minimum);
        require(canBeTransferring >= amount, "insufficient balance to maintain minimum lockup");
            
        
    }

}

contract T2 is Minimums {
    
    using SafeMathUpgradeable for uint256;
    
    function tAdd() public {
        _minimumsAdd(address(this),100, block.timestamp+100,true);
    }
    
    // function tAddTimes() public {
    //     for(uint256 i = 0; i < 100; i++){
    //         _minimumsAdd(address(this),100, block.timestamp+1,true);
    //     }
    // }
    function tGet() public view returns(uint256 ret) {
        (, ret) = getMinimum(address(this));
    }
    function tCheck() public view {
        uint256 amount = 50;
        uint256 minimum;
        (, minimum) = getMinimum(address(this));
           
        uint256 canBeTransferring = (uint256(100)).sub(minimum);
        require(canBeTransferring >= amount, "insufficient balance to maintain minimum lockup");
            
        
    }

}

