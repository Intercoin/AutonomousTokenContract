const TradedTokenContract = artifacts.require("TradedTokenContract");
const TradedTokenContractMock = artifacts.require("TradedTokenContractMock");

module.exports = function(deployer, network) {
    deployer.deploy(
        TradedTokenContract
    );
    deployer.deploy(
        TradedTokenContractMock
    );

    
};
