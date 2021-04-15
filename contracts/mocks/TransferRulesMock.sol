// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../TransferRules.sol";
/*
 * @title TransferRules contract
 * @dev Contract that is checking if on-chain rules for token transfers are concluded.
 * It implements whitelist and grey list.
 */
contract TransferRulesMock is TransferRules {
    
	using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    
    function getMinimumsList(address addr) public view returns (uint256[] memory ret, uint256[] memory ret2 ) {
         
        uint256 mapIndex = 0;
        ret = new uint256[](users[addr].minimumsIndexes.length());
        ret2 = new uint256[](users[addr].minimumsIndexes.length());
        for (uint256 i=0; i<users[addr].minimumsIndexes.length(); i++) {
            
            mapIndex = users[addr].minimumsIndexes.at(i);
            ret[i] = users[addr].minimums[mapIndex].amount;
            ret2[i] = users[addr].minimums[mapIndex].timestampEnd;
            
        }
        //return ret;
            
    }
    
    
    function isWhitelistedMock(string memory groupName, address addr) public view returns (bool) {
        return _isWhitelisted(groupName, addr);
    }
    
    function getManagersGroupName() public view returns(string memory) {
        return managersGroupName;
    }
    
    function getLockup(address from) public view returns(uint256, bool) {
        return (
            users[from].lockup.duration,
            users[from].lockup.exists
        );
    }
    
}
    