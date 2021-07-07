// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libs/FixedPoint.sol";

interface ITradedTokenContract {
    
    struct SellTax {
        uint256 percentOfTokenAmount; // times to divide
        uint256 priceIncreaseMin;
        uint256 slippage;
    }
    
    struct BuyTax {
        uint256 percentOfTokenAmount;
        uint256 priceDecreaseMin;
        uint256 slippage;
        uint256 percentOfSellPrice;
    }

    struct TransferTax {
        uint256 total;
        uint256 toLiquidity;
        uint256 toBurn;
    }
    struct ProgressiveTax {
        uint256 from;
        uint256 to;
        uint256 duration;
    }
    struct DisbursementList {
        address addr;
        uint256 percent;
    }
    
    struct BulkStruct {
        address recipient;
        uint256 amount;
    }
    
    struct RecentStruct {
        uint256 sentPercent;
        uint256 balance;
        uint256 timestamp;
        bool exists;
    }
    
    struct SyncAmounts {
        uint256 token;
        uint256 eth;
    }
    
    struct CurrentPrices {
        FixedPoint.uq112x112 sell;
        FixedPoint.uq112x112 buy;
    }
    
    struct CurrentReserves {
        uint256 token;
        uint256 eth;
    }
    
    //function setInitialPrice(uint256 price) external;
    function initialize(
        string memory name, 
        string memory symbol, 
        address[] memory defaultOperators, 
        uint256 _presalePrice,
        BulkStruct[] memory _predefinedBalances,
        BuyTax memory _buyTax,
        SellTax memory _sellTax,
        TransferTax memory _transfer,
        ProgressiveTax memory _progressive,
        DisbursementList[] memory _disbursementList
    ) external;
    
    event RulesUpdated(address rules);

    event SwapAndLiquifyEnabledUpdated(bool enabled);
    event SwapAndLiquify(
        uint256 tokensSwapped,
        uint256 ethReceived,
        uint256 tokensIntoLiqudity
    );
    
    //event SentDisbursement(address to, uint256 amount);
    event SentDisbursements();
    
    event SentBonusToInviter(address to, uint256 amount);
    event Received(address sender, uint amount);
    
    event NotEnoughTokenToSell(uint256 amount);
    event NotEnoughETHToBuyTokens(uint256 amount);
    event NoAvailableReserves();
    event NoAvailableReserveToken();
    event NoAvailableReserveETH();
    
    event ContractSellTokens(uint256 amount, uint256 eth);
    event ContractBuyBackTokens(uint256 amount, uint256 eth);
    
    // emitted events when contract should to sell or to buy tokens from/to LP
    event ShouldSell();
    event ShouldBuy();
    
    
    enum NeedToEmitEvent { 
        None,
        Unknown,
        ShouldSell,
        ShouldBuy,
        NoAvailableReserves,
        NoAvailableReserveETH,
        NotEnoughTokenToSell,
        NotEnoughETHToBuyTokens
    }
}
