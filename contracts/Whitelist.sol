// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
/**
 * Realization a addresses whitelist
 * 
 */
contract Whitelist is OwnableUpgradeable {
    using SafeMathUpgradeable for uint256;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    struct List {
        address addr;
        bool alsoGradual;
    }
    struct ListStruct {
        EnumerableSetUpgradeable.AddressSet indexes;
        mapping(address => List) data;
    }
    
    string internal commonGroupName;
    
    mapping(string => ListStruct) list;

    modifier onlyWhitelist(string memory groupName) {
        require(
            list[groupName].indexes.contains(_msgSender()) == true, 
            "Sender is not in whitelist"
        );
        _;
    }
   
    function __Whitelist_init(
    )
        internal 
        initializer 
    {
        commonGroupName = 'common';
        __Ownable_init();
    }
    
    
    /**
     * Adding addresses list to whitelist 
     * 
     * @dev available to Owner only
     * Requirements:
     *
     * - `_addresses` cannot contains the zero address.
     * 
     * @param _addresses list of addresses which will be added to whitelist
     * @return success return true in any cases
     */
    function whitelistAdd(address[] memory _addresses) public virtual returns (bool success) {
        success = _whitelistAdd(commonGroupName, _addresses);
    }
    
    /**
     * Removing addresses list from whitelist
     * 
     * @dev Available to Owner only
     * Requirements:
     *
     * - `_addresses` cannot contains the zero address.
     * 
     * @param _addresses list of addresses which will be removed from whitelist
     * @return success return true in any cases 
     */
    function whitelistRemove(address[] memory _addresses) public virtual returns (bool success) {
        success = _whitelistRemove(commonGroupName, _addresses);
    }

    /**
    * Checks if a address already exists in a whitelist
    * 
    * @param addr address
    * @return result return true if exist 
    */
    function isWhitelisted(address addr) public virtual view returns (bool result) {
        result = _isWhitelisted(commonGroupName, addr);
    }
    
    
    function _whitelistAdd(string memory groupName, address[] memory _addresses) internal returns (bool) {
        for (uint i = 0; i < _addresses.length; i++) {
            require(_addresses[i] != address(0), "Whitelist: Contains the zero address");
            
            if (list[groupName].indexes.contains(_addresses[i]) == true) {
                // already exist
            } else {
                list[groupName].indexes.add(_addresses[i]);
                list[groupName].data[_addresses[i]].addr = _addresses[i];
            }
        }
        return true;
    }
    
    function _whitelistRemove(string memory groupName, address[] memory _addresses) internal returns (bool) {
        for (uint i = 0; i < _addresses.length; i++) {
            if (list[groupName].indexes.remove(_addresses[i]) == true) {
                delete list[groupName].data[_addresses[i]];
            }
        }
        return true;
    }
    
    function _isWhitelisted(string memory groupName, address addr) internal view returns (bool) {
        return list[groupName].indexes.contains(addr);
    }
  
}