const TransferRules = artifacts.require("TransferRules");

module.exports = function(deployer, network) {
    deployer.deploy(
        TransferRules
    );
};
