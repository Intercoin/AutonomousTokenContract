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
		<td><a href="#initialize">initialize</a></td>
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
		<td><a href="#sell">sell</a></td>
		<td>Anyone</td>
		<td>initiate mechanism to smooth out buy and sell prices. Contract will sell some own tokens to LP</td>
	</tr>
	<tr>
		<td><a href="#buy">buy</a></td>
		<td>Anyone</td>
		<td>initiate mechanism to smooth out buy and sell prices. Contract will buy back some tokens from LP</td>
	</tr>
</tbody>
</table>
	

## Settings
TotalSupply are 1_000_000_000 tokens

## Methods

#### initialize
Params:
name  | type | description
--|--|--
name|string| ERC777 token's name 
symbol|string| ERC777 token's symbol 
defaultOperators|address[]| ERC777 token's defaultOperators 
_predefinedBalances|<a href="#bulkstruct">tuple</a>[]| array of tuples like [address,amount] of user balances that need to be predefined 
_buyTax|<a href="#buytax">tuple</a>| buy settings -  [percentOfTokenAmount, priceDecreaseMin, slippage, percentOfSellPrice]. Default are [0, 10, 10, 0]
_sellTax|<a href="#selltax">tuple</a>| sell settings -  [percentOfTokenAmount, priceIncreaseMin, slippage]. Default are [0, 10, 10]
_transferTax|<a href="#transfertax">tuple</a>| transfer settings - [total, toLiquidity, toBurn]. Default are [0, 10, 0] 
_progressiveTax|<a href="#progressivetax">tuple</a>| progressive settings - [from, to, duration]. Default are [5, 100, 3600]
_ownersList|<a href="#ownerslist">tuple</a>[]|array of tuples like [owner address, percent]. sum of percents require to be 100%
        
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
rules|address| TransferRules address contract

TransferRules contract flow validation described <a href="https://github.com/Intercoin/ITR/blob/assets/diagrams/transfer-rules-v4.png" target="_blank">here</a>

#### bulkTransfer
Params:
name  | type | description
--|--|--
_bulkStruct|tuple[] array of tuples [recipient, address]
_data|bytes|data to operatorSend params

#### sell
mechanism to smooth out buy and sell prices. Contract will sell some own tokens to LP

#### buy
mechanism to smooth out buy and sell prices. Contract will buyback some tokens from LP

## Tuples
#### BulkStruct
Params:
name  | type | description
--|--|--
recipient|address| address
amount|uint256| amount

#### BuyTax
Params:
name  | type | description
--|--|--
percentOfTokenAmount|uint256| percent of LP token's reserve that need to be buyback by contract
priceDecreaseMin|uint256| triggered event <a href="#shouldbuy">ShouldBuy</a> when current sell price will fall by priceDecreaseMin percents of last buyback price
slippage|uint256| slippage
percentOfSellPrice|uint256| buyback price will update after everytime when contract sell tokens by formula buybackprice = sellprice * percentOfSellPrice / 100

#### SellTax
Params:
name  | type | description
--|--|--
percentOfTokenAmount|uint256| percent of LP token's reserve that need to be sell by contract
priceIncreaseMin|uint256| triggered event <a href="#shouldsell">ShouldSell</a> when current sell price will rise by priceIncreaseMin percents of last LastMaxSellPrice
slippage|uint256| slippage

#### TransferTax
Params:
name  | type | description
--|--|--
total|uint256| calculate percent of transfer that applied on each usual transfer(not exchange with Uniswap)
toLiquidity|uint256| percent of total that will add to liquidity
toBurn|uint256| percent of LP tokens that contract will burn after adding liquidity. can be [0;100]

#### ProgressiveTax
Params:
name  | type | description
--|--|--
from|uint256| percent
to|uint256| percent
duration|uint256| progressive tax  can be applied to user by this duration

#### OwnersList
Params:
name  | type | description
--|--|--
addr|address| address
percent|uint256| percent [1;100]
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
		<td>SentFundToOwner</td>
		<td>when person of owner list get some fudns</td>
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
		<td>when no available Coins in LP reserve</td>
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
		<td>ShouldSell</td>
		<td>when current sell price become more than lastMaxSellPrice</td>
	</tr>
	<tr>
		<td>ShouldBuy</td>
		<td>when current sell price become less than lastBuyPrice</td>
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
- [periodically] need to call <a href="#sell">sell</a> or <a href="#buy">buy</a> to smooth out prices. Logic described at <a href="https://github.com/Intercoin/TradedTokenContract/issues/6">issues-6</a>


