# TradedTokenContact
Contract for issuing tokens to be sold to others, and traded on exchanges.

## About

### :whale: Incentives for Long Term Holds and Relationships

* No tax on buying, or transferring small amounts
* Progressive tax on transferring larger % of balance in a given time period

### :rocket: Dispensing new tokens only at All-Time-Highs

* All tokens are sold into circulation by the contract
* Sold only when price is already at the all-time-high
* Additional tokens enter circulation only when 
demanded by the market

### :dollar: Buybacks to Counter Dumping by Whales

* Proceeds from sales go to liquidity (10%), buybacks (20%) and disbursements (70%)
* When price falls below threshold, contract buys back tokens and takes them out of circulation
* Dumping by whales leads to smaller token supply, pushing the price back up

### :lock: Locked Liquidity Proves No Rug-Pulls Guaranteed

* Automatically adds liquidity from sales and transaction taxes
* Specify percentage of LP tokens to burn by the contract

### :fire: Options to Deflate Currency Supply

* Taxes can remove tokens from circulation
* Taxes can be distributed to liquidity
* Taxes can be used to pay referral fees to the account who invited you, incentivizing people to invite others

### :credit_card: Disbursing the proceeds

* Contract sells the tokens, never dumping.
* Disburses shares of proceeds to one or more addresses.
* Those addresses can be smart contracts that handle disbursements to the original team and investors, or for discounts to certain groups.

### :people_holding_hands: Power to the People

* The tokens wind up in the hands of the community
* Encourages investment, stability and growth
* Penalizes dumping and eliminates rugpulls

## Overview
Once installed will be use methods:

<table>
<thead>
	<tr>
		<th>method name</th>
		<th>called by</th>
		<th>description</th>
	</tr>
</thead>
<tbody>
	<tr>
		<td><a href="#initialize">Initialize</a></td>
		<td>Anyone</td>
		<td>initialize a contract</td>
	</tr>
	<tr>
		<td><a href="#setinitialprice">setInitialPrice</a></td>
		<td>owner</td>
		<td>set initial price. can be caaled only once</td>
	</tr>
	<tr>
		<td><a href="#updaterestrictionsandrules">_updateRestrictionsAndRules</a></td>
		<td>owner</td>
		<td>set address of TransferRules contract.</td>
	</tr>
	<tr>
		<td><a href="#bulktransfer">bulkTransfer</a></td>
		<td>Anyone</td>
		<td>bulk transfer support</td>
	</tr>
	<tr>
		<td><a href="#correctprices">correctPrices</a></td>
		<td>Anyone</td>
		<td>initiate mechanism to smooth out buy and sell prices</td>
	</tr>
	

## Settings
TotalSupply are 1_000_000_000 tokens

## Methods

#### Initialize
Params:
name  | type | description
--|--|--
name|string| ERC777 token's name 
symbol|string| ERC777 token's symbol 
defaultOperators|address[]| ERC777 token's defaultOperators 
_predefinedBalances|tuple[]| array of tuples like [address,amount] of user balances that need to be predefined 
_buyTax|tuple| buy settings -  [percentOfTokenAmount, priceIncreaseMin, slippage, percentOfSellPrice]. Default are [0, 10, 10, 0]
_sellTax|tuple| sell settings -  [percentOfTokenAmount, priceIncreaseMin, slippage]. Default are [0, 10, 10]
_transferTax|tuple| transfer settings - [total, toLiquidity, toBurn]. Default are [0, 10, 0] 
_progressiveTax|tuple| progressive settings - [from, to, duration]. Default are [5, 100, 3600]
_ownersList|tuple[]|array of tuples like [owner address, percent]. sum of percents require to be 100%
        
#### setInitialPrice
Params:
name  | type | description
--|--|--
price|uint256| price mul by 1e9

method initiate first price by adding liquidity.
contract eth balance will divide by price to get token amount
token's amount and eth will be added to liquidity pool.

#### updateRestrictionsAndRules
Params:
name  | type | description
--|--|--
rules|address| TrasferRules address contract

TrasferRules contract flow validation described <a href="https://github.com/Intercoin/ITR/blob/assets/diagrams/transfer-rules-v4.png" target="_blank">here</a>

#### bulkTransfer
Params:
name  | type | description
--|--|--
_bulkStruct|tuple[] array of tuples [recipient, address]
_data|bytes|data to operatorSend params

#### correctPrices
mechanism to smooth out buy and sell prices

## Events

<table>
<thead>
	<tr>
		<th>event name</th>
		<th>description</th>
	</tr>
</thead>
<tbody>
	<tr>
		<td>RulesUpdated</td>
		<td>when Rules contract updated</td>
	</tr>
	<tr>
		<td>SwapAndLiquifyEnabledUpdated</td>
		<td>when flag SwapAndLiquifyEnabled changed</td>
	</tr>
	<tr>
		<td>SwapAndLiquify</td>
		<td>when SwapAndLiquify happens</td>
	</tr>
	<tr>
		<td>SentBonusToInviter</td>
		<td>when inviter get some bonus</td>
	</tr>
	<tr>
		<td>Received</td>
		<td>when contract get ETH </td>
	</tr>
	<tr>
		<td>NotEnoughTokenToSell</td>
		<td>when contract didn't have enough tokens to sell</td>
	</tr>
	<tr>
		<td>NotEnoughETHToBuyTokens</td>
		<td>when contract didn't have enough Coins to buy tokens</td>
	</tr>
	<tr>
		<td>NoAvailableReserves</td>
		<td>when no available LP reserve</td>
	</tr>
	<tr>
		<td>NoAvailableReserveToken</td>
		<td>when no available tokens in LP reserve</td>
	</tr>
	<tr>
		<td>NoAvailableReserveETH</td>
		<td>when no available Coins LP reserve</td>
	</tr>
	<tr>
		<td>ContractSellTokens</td>
		<td>when contract sell additional tokens to LP successfully</td>
	</tr>
	<tr>
		<td>ContractBuyBackTokens</td>
		<td>when contract buy back tokens from LP successfully</td>
	</tr>
	<tr>
		<td></td>
		<td></td>
	</tr>
</table>

## Example to use
After deploy owner need:
- to call method <a href="#initialize">initialize</a>. to correctly initialize contract and all sub contracts inside
- [optionally] if need to activate Transfer Rules regulation:
-- to deploy TransferRules contract (or get exist address)
-- to call method <a href="#updaterestrictionsandrules">_updateRestrictionsAndRules</a> to link our token with Transfer Rules contract.
- to send to contract some coins(eth or bnb) and call method <a href="#setinitialprice">setInitialPrice</a> to add to liquidity pool all contract's coins and calculated tokens amount via transferred price as param
- at last owner should call `renounceOwnership` to show that contract does not own him
now any person can use pancakeSwap to exchange his coins to our tokens and vice versa
- [periodically] need to call <a href="#correctprices">correctPrices</a> to smooth out prices. Logic described at <a href="https://github.com/Intercoin/TradedTokenContract/issues/6">issues-6</a>


