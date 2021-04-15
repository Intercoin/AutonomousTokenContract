// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./interfaces/ITransferRules.sol";
import "./IntercoinTrait.sol";

contract TradedTokenContract is ERC777Upgradeable, OwnableUpgradeable, IntercoinTrait {
    using SafeMathUpgradeable for uint256;

    /**
     * Configured contract implementing token rule(s).
     * If set, transfer will consult this contract should transfer
     * be allowed after successful authorization signature check.
     * And call doTransfer() in order for rules to decide where fund
     * should end up.
     */
    ITransferRules public _rules;
    
    event RulesUpdated(address rules);

    function initialize(
        string memory name, 
        string memory symbol, 
        address[] memory defaultOperators
    ) 
        public 
        virtual 
        initializer 
    {
        __Ownable_init();
        __ERC777_init(name, symbol, defaultOperators);
        _mint(owner(), 1_000_000_000 * 10 ** 18, "", "");
    }
    
    /**
     * @dev Creates `amount` tokens and send to account.
     *
     * See {ERC20-_mint}.
     */
    function mint(
        address account, 
        uint256 amount
    ) 
        public 
        onlyOwner 
        virtual  
    {
        require((totalSupply().add(amount) <= 1_000_000_000 * 10 ** 18), "Total supply exceed cap");
        _mint(account, amount, bytes(''), bytes(''));
    }
    
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
    
    
     function _updateRestrictionsAndRules(address rules) public returns (bool) {

        _rules = ITransferRules(rules);

        if (rules != address(0)) {
            require(_rules.setERC(address(this)), "SRC20 contract already set in transfer rules");
        }

        emit RulesUpdated(rules);
        return true;
    }
    
    function bulkTransfer(address[] memory _recipients, uint256 _amount, bytes memory _data) public {
        for (uint256 i = 0; i < _recipients.length; i++) {
            operatorSend(msg.sender, _recipients[i], _amount, _data, "");
        }
    }
  
}