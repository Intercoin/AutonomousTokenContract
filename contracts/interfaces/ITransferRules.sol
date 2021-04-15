// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
/**
 * @title ITransferRules interface
 * @dev Represents interface for any on-chain SRC20 transfer rules
 * implementation. Transfer Rules are expected to follow
 * same interface, managing multiply transfer rule implementations with
 * capabilities of managing what happens with tokens.
 *
 * This interface is working with ERC777 transfer() function
 */
interface ITransferRules {
    function setERC(address erc777) external returns (bool);
    function applyRuleLockup(address from, address to, uint256 value) external returns (bool);
}