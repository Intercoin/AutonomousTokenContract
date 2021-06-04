const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js');
const helperCostEth = require("../helpers/transactionsCost");

sendAndCheckCorrectBalance = async (obj, from, to, value, message) => {

    let balanceAccount1Before = await obj.balanceOf(from);
    let balanceAccount2Before = await obj.balanceOf(to);

    let trTmp = await obj.transfer(to, value, { from: from });
    helperCostEth.transactionPush(trTmp, 'transfer tokens');

    let balanceAccount1After = await obj.balanceOf(from);
    let balanceAccount2After = await obj.balanceOf(to);

    assert.equal(
        (BigNumber(balanceAccount1Before).minus(value)).toString(),
        (BigNumber(balanceAccount1After)).toString(),
        "wrong balance for 1st account " + message
    );
    
    assert.equal(
        (BigNumber(balanceAccount2Before).plus(value)).toString(),
        (BigNumber(balanceAccount2After)).toString(),
        "wrong balance for 2nd account " + message
    );
}
    
module.exports = {
    sendAndCheckCorrectBalance
}