// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../TradedTokenContract.sol";
import "../interfaces/ITransferRules.sol";

contract TradedTokenContractMock is TradedTokenContract {
    
   /**
     * @dev Creates `amount` tokens and send to account.
     *
     * See {ERC20-_mint}.
     */
    function mint(address account, uint256 amount) public onlyOwner override  {
        bytes memory userData = bytes('');
        bytes memory operatorData=bytes('');
        _mint(account, amount, userData, operatorData);
    }
        
}