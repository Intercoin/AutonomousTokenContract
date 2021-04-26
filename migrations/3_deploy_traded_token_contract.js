const TradedTokenContract = artifacts.require("TradedTokenContract");

module.exports = function(deployer, network) {
    deployer.deploy(
        TradedTokenContract
    );
};
