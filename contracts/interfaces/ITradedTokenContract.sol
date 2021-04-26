// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITradedTokenContract {
    struct SellTax {
        uint256 eventsTotal; // times to divide
        uint256 priceIncreaseMin;
        uint256 slippage;
        
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
    struct OwnersList {
        address addr;
        uint256 percent;
    }
    
    struct BulkStruct {
        address recipient;
        uint256 amount;
    }
    
    //function setInitialPrice(uint256 price) external;
    function initialize(
        string memory name, 
        string memory symbol, 
        address[] memory defaultOperators, 
        BulkStruct[] memory _predefinedBalances,
        SellTax memory _sellTax,
        TransferTax memory _transfer,
        ProgressiveTax memory _progressive,
        OwnersList[] memory _ownersList
    ) external;
    
    
}
