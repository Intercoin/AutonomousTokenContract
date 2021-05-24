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
    function mint(address account, uint256 amount) public onlyOwner virtual  {
        bytes memory userData = bytes('');
        bytes memory operatorData=bytes('');
        _mint(account, amount, userData, operatorData);
    }
        
    function getLatestPrice() public view returns(uint256 x){
        x = lastMaxSellPrice._x;
        
    }
    
    
    address[] transferFrom_holder;
    address[] transferFrom_recipient;
    function transferFrom(address holder, address recipient, uint256 amount) public virtual override  returns (bool) {
        
        transferFrom_holder.push(holder);
        transferFrom_recipient.push(recipient);
        
        bool success = super.transferFrom(holder, recipient, amount);

        return success;
    }
    
    function getTransferFromAddresses() public view returns(address[] memory holders, address[] memory recipients) {
        return (transferFrom_holder, transferFrom_recipient);
    }
   
        
}