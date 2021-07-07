// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/ITradedTokenContract.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract TradedTokenFactory is OwnableUpgradeable, ReentrancyGuardUpgradeable {
   
    address contractInstance;
    event Produced(address caller, address addr);
  
    function init(address _contractInstance) public initializer  {
        __Ownable_init();
        contractInstance = _contractInstance;
    }
    
    function produce(
        string memory name, 
        string memory symbol, 
        address[] memory defaultOperators, 
        uint256 _presalePrice,
        ITradedTokenContract.BulkStruct[] memory _predefinedBalances,
        ITradedTokenContract.BuyTax memory _buyTax,
        ITradedTokenContract.SellTax memory _sellTax,
        ITradedTokenContract.TransferTax memory _transfer,
        ITradedTokenContract.ProgressiveTax memory _progressive,
        ITradedTokenContract.DisbursementList[] memory _disbursementList
    ) 
        public 
        nonReentrant
        returns(address) 
    {
        
        address proxy = createClone(address(contractInstance));
        
        ITradedTokenContract(proxy).initialize(
            name,
            symbol,
            defaultOperators,
            _presalePrice,
            _predefinedBalances,
            _buyTax,
            _sellTax,
            _transfer,
            _progressive,
            _disbursementList
            );

        emit Produced(msg.sender, proxy);
        return proxy;
    }
    
    function createClone(address target) internal returns (address result) {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(clone, 0x14), targetBytes)
            mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            result := create(0, clone, 0x37)
        }
    }
    
}
