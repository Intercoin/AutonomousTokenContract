// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../src20/BaseTransferRule.sol";
import "./MockRuleSettings.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

contract MockRule1 is BaseTransferRule, MockRuleSettings {
    using StringsUpgradeable for uint256;
    
    uint256 constant ind = 1;
    
    function init() public initializer {
        __BaseTransferRule_init();
    }
    
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
        if (shouldRevert) {
            revert(string(abi.encodePacked("ShouldRevert#", ind.toString())));
        }
        (_from,_to,_value) = (from,to,value);
    }
}