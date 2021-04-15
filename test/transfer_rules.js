const BigNumber = require('bignumber.js');
const util = require('util');

const TransferRulesMock = artifacts.require("TransferRulesMock");
//const ExternalItrImitationMock = artifacts.require("ExternalItrImitationMock");
const TradedTokenContractMock = artifacts.require("TradedTokenContractMock");


const truffleAssert = require('truffle-assertions');
const helper = require("../helpers/truffleTestHelper");

const helperCostEth = require("../helpers/transactionsCost");

require('@openzeppelin/test-helpers/configure')({ web3 });
const { singletons } = require('@openzeppelin/test-helpers');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

contract('TransferRules', (accounts) => {
    
    // it("should assert true", async function(done) {
    //     await TestExample.deployed();
    //     assert.isTrue(true);
    //     done();
    //   });
    
    // Setup accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];  
    const accountThree = accounts[2];
    const accountFourth= accounts[3];
    const accountFive = accounts[4];
    const accountSix = accounts[5];
    const accountSeven = accounts[6];
    const accountEight = accounts[7];
    const accountNine = accounts[8];
    const accountTen = accounts[9];
    const accountEleven = accounts[10];
    const accountTwelwe = accounts[11];
    
    const zeroAddr = '0x0000000000000000000000000000000000000000';
    const version = '0.1';
    const name = 'ITR Token TEST';
    const symbol = 'ITRT';
    const defaultOperators = [];
    
    const duration1Day = 86_400;       // 1 year
    const durationLockupUSAPerson = 31_536_000;       // 1 year
    const durationLockupNoneUSAPerson = 3_456_000;    // 40 days
    
    var erc1820;
    
    
    // temp vars used at compare status and variables
    let tmp, tmpBool, tmpBool2, tmpBalance, tmpCounter, trTmp;

    helperCostEth.transactionsClear();
    
    async function sendAndCheckCorrectBalance(obj, from, to, value, message) {
        let balanceAccount1Before = await obj.balanceOf(from);
        let balanceAccount2Before = await obj.balanceOf(to);
        
        let trTmp = await obj.transfer(to, value, {from: from});
        helperCostEth.transactionPush(trTmp, 'transfer tokens');
        
        let balanceAccount1After = await obj.balanceOf(from);
        let balanceAccount2After = await obj.balanceOf(to);

        assert.equal(
            (BigNumber(balanceAccount1Before).minus(value)).toString(),
            (BigNumber(balanceAccount1After)).toString(),
            "wrong balance for 1st account "+message
        )
        assert.equal(
            (BigNumber(balanceAccount2Before).plus(value)).toString(),
            (BigNumber(balanceAccount2After)).toString(),
            "wrong balance for 2nd account "+message
        )
    }
    
    var TransferRulesInstance;
    beforeEach(async() =>{
        erc1820= await singletons.ERC1820Registry(accountNine);

        //TransferRulesInstance = await deployProxy(TransferRulesMock);
        this.TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        await this.TransferRulesInstance.init({from: accountTen});
    });

    it('create and initialize', async () => {
        //var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        helperCostEth.transactionPush(this.TransferRulesInstance, 'TransferRulesInstance::new');
        
        // trTmp = await this.TransferRulesInstance.init({from: accountTen});
        // helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::init');
    });
      
    it('setERC test', async () => {
        var TradedTokenContractMockInstance = await TradedTokenContractMock.new({from: accountTen});
        await TradedTokenContractMockInstance.initialize(name, symbol, defaultOperators, {from: accountTen});
        //---
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        // _updateRestrictionsAndRules     
        trTmp = await TradedTokenContractMockInstance._updateRestrictionsAndRules(zeroAddr, {from: accountTen});
        helperCostEth.transactionPush(trTmp, '_updateRestrictionsAndRules');
        
        await TradedTokenContractMockInstance._updateRestrictionsAndRules(this.TransferRulesInstance.address, {from: accountTen});
        await truffleAssert.reverts(
            TradedTokenContractMockInstance._updateRestrictionsAndRules(this.TransferRulesInstance.address, {from: accountTen}),
            'external contract already set'
        );
        
    });
 
    it('owner can manage role `managers`', async () => {
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        await truffleAssert.reverts(
            this.TransferRulesInstance.managersAdd([accountOne], {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        await truffleAssert.reverts(
            this.TransferRulesInstance.managersRemove([accountOne], {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        
        let managersGroupName = await this.TransferRulesInstance.getManagersGroupName({from: accountTen});
        
        trTmp = await this.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::managersAdd');
        tmpBool = await this.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, {from: accountTen});
        assert.equal(tmpBool, true, 'could not add manager');
        
        trTmp = await this.TransferRulesInstance.managersRemove([accountOne], {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::managersRemove');
        tmpBool = await this.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, {from: accountTen});
        assert.equal(tmpBool, false, 'could not remove manager');
        
        
        // remove from list if none exist before
        tmpBool = await this.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountTwo, {from: accountTen});
        await this.TransferRulesInstance.managersRemove([accountTwo], {from: accountTen});
        tmpBool2 = await this.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountTwo, {from: accountTen});
        assert.equal(tmpBool, tmpBool2, 'removing manager from list if none exist before went wrong');
        
        // add to list if already exist
        await this.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        tmpBool = await this.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, {from: accountTen});
        await this.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        tmpBool2 = await this.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, {from: accountTen});
        assert.equal(tmpBool, tmpBool2, 'adding manager list if already exist went wrong');
        
    });
 
    
    it('managers can add/remove person to whitelist', async () => {
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        await truffleAssert.reverts(
            this.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne}), 
            "Sender is not in whitelist"
        );
        
        //owner can't add into whitelist if he will not add himself to managers list
        await truffleAssert.reverts(
            this.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountTen}), 
            "Sender is not in whitelist"
        );
        
        await this.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        
        tmpBool = await this.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        trTmp = await this.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::whitelistAdd');
        tmpBool2 = await this.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        assert.equal(((tmpBool != tmpBool2) && tmpBool2 == true), true, 'could add person to whitelist');
        
        tmpBool = await this.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        trTmp = await this.TransferRulesInstance.whitelistRemove([accountTwo], {from: accountOne});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::whitelistRemove');
        tmpBool2 = await this.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        assert.equal(((tmpBool != tmpBool2) && tmpBool2 == false), true, 'could add person to whitelist');
        //---------
        // remove from list if none exist before
        tmpBool = await this.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        await this.TransferRulesInstance.whitelistRemove([accountTwo], {from: accountOne});
        tmpBool2 = await this.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        assert.equal(tmpBool, tmpBool2, 'removing person from list if none exist before, went wrong');
        
        // add to list if already exist
        await this.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne});
        tmpBool = await this.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        await this.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne});
        tmpBool2 = await this.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        assert.equal(tmpBool, tmpBool2, 'adding person to whitelist if already exist, went wrong');
        
    });
   
    it('should no restrictions after deploy', async () => {
    
        var TradedTokenContractMockInstance = await TradedTokenContractMock.new({from: accountTen});
		await TradedTokenContractMockInstance.initialize(name, symbol, defaultOperators, {from: accountTen});
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        // _updateRestrictionsAndRules     
        await TradedTokenContractMockInstance._updateRestrictionsAndRules(zeroAddr, {from: accountTen});
        
        // create managers
        await this.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        await this.TransferRulesInstance.managersAdd([accountTwo], {from: accountTen});
        
        // create whitelist persons
        await this.TransferRulesInstance.whitelistAdd([accountThree], {from: accountOne});
        await this.TransferRulesInstance.whitelistAdd([accountFourth], {from: accountTwo});
        
        
        let arr = [accountOne,accountTwo,accountThree,accountFourth];
        // mint to all accounts 1000 ITR
        // and to itself(owner) too
        for(var i=0; i<arr.length; i++) {
            await TradedTokenContractMockInstance.mint(arr[i], BigNumber(1000*1e18), {from: accountTen});
            // check Balance
            tmpBalance = await TradedTokenContractMockInstance.balanceOf(arr[i]);
            assert.equal(
                (BigNumber(1000*1e18)).toString(),
                (BigNumber(tmpBalance)).toString(),
                "wrong balance for account "+arr[i]
            )
        }
        
        
        
        
        // try to send 10ITR and send back 40ITR for each account
        tmpCounter = 0;
        for(var i=0; i<arr.length; i++) {
            for(var j=0; j<arr.length; j++) {
                // except from itself to itself
                if (arr[i] != arr[j]) {
                    tmpCounter++;

                    await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, arr[i], arr[j], BigNumber(10*1e18), "Iteration#"+tmpCounter+" (sendTo)");
                    await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, arr[j], arr[i], BigNumber(40*1e18), "Iteration#"+tmpCounter+" (sendBack)");
                }
            }
        }

    });

    it('automaticLockup should call only by owner', async () => {
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        await truffleAssert.reverts(
            this.TransferRulesInstance.automaticLockupAdd(accountOne, 5, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        await truffleAssert.reverts(
            this.TransferRulesInstance.automaticLockupRemove(accountOne, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        
        trTmp = await this.TransferRulesInstance.automaticLockupAdd(accountOne, 5, {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::automaticLockupAdd');
        trTmp = await this.TransferRulesInstance.automaticLockupRemove(accountOne, {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::automaticLockupRemove');
    });
    
    it('minimums should call only by owner', async () => {
        let latestBlockInfo = await web3.eth.getBlock("latest");
        
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        await truffleAssert.reverts(
            this.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500*1e18), latestBlockInfo.timestamp + duration1Day, true, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        await truffleAssert.reverts(
            this.TransferRulesInstance.minimumsClear(accountOne, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        
        trTmp = await this.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500*1e18), latestBlockInfo.timestamp + duration1Day, true, {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::minimumsAdd');
        trTmp = await this.TransferRulesInstance.minimumsClear(accountOne, {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::minimumsClear');
    });

    it('testing automaticLockup', async () => {
        var TradedTokenContractMockInstance = await TradedTokenContractMock.new({from: accountTen});
		await TradedTokenContractMockInstance.initialize(name, symbol, defaultOperators, {from: accountTen});
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        // _updateRestrictionsAndRules     
        await TradedTokenContractMockInstance._updateRestrictionsAndRules(this.TransferRulesInstance.address, {from: accountTen});
        
        //mint accountOne 1000ITR
        await TradedTokenContractMockInstance.mint(accountOne, BigNumber(1500*1e18), {from: accountTen});
        
        // be sure that accountOne can send to someone without lockup limit
        await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountTwo, BigNumber(500*1e18), "Iteration#1");
        await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountTwo, accountThree, BigNumber(500*1e18), "Iteration#2");
        
        // setup automatic lockup for accountOne for 1 day
        await this.TransferRulesInstance.automaticLockupAdd(accountOne, 1, {from: accountTen});
        // check lockup exist
        tmp = await this.TransferRulesInstance.getLockup(accountOne, {from: accountTen});
        assert.equal(tmp[0].toString(),(BigNumber(1).times(BigNumber(86400))).toString(), 'duration lockup was set wrong');
        assert.equal(tmp[1],true, 'duration lockup was set wrong');
        
       
        // send to accountFourth
        await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(500*1e18), "Iteration#3");
        // try to send 500 ITR tokens from accountFourth to accountFive
        // expecting that tokens will be lock for accountFourth for 1 day

        await truffleAssert.reverts(
            TradedTokenContractMockInstance.transfer(accountFive, BigNumber(500*1e18), {from: accountFourth}), 
            "Transfer not authorized"
        );
        
        tmpBool = await this.TransferRulesInstance.authorize(accountFourth, accountFive, BigNumber(500*1e18), {from: accountFourth});
        assert.equal(tmpBool, false, 'emsg `Transfer not authorized` does not emit');
        
      
        // pass 1 days
        await helper.advanceTimeAndBlock(1*duration1Day);

        
        // and try again
        await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountFourth, accountFive, BigNumber(500*1e18), "Iteration#4");
        
        
        ///// 
        // remove automaticLockup from accountOne
        await this.TransferRulesInstance.automaticLockupRemove(accountOne, {from: accountTen});
        // send to accountFourth another 500 ITR
        await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(500*1e18), "Iteration#5");
        // expecting that the tokens doesnot locked up and transfered w/out reverts
        await TradedTokenContractMockInstance.transfer(accountFive, BigNumber(500*1e18), {from: accountFourth});
        
    });
 
    it('whitelistReduce should reduce locked time for whitelist persons', async () => {
        var TradedTokenContractMockInstance = await TradedTokenContractMock.new({from: accountTen});
		await TradedTokenContractMockInstance.initialize(name, symbol, defaultOperators, {from: accountTen});
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        // _updateRestrictionsAndRules     
        await TradedTokenContractMockInstance._updateRestrictionsAndRules(this.TransferRulesInstance.address, {from: accountTen});
        
        // owner adding manager 
        await this.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        // manager adding person into whitelist
        await this.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne});
        
        // setup 4 days locked up for manager
        await this.TransferRulesInstance.automaticLockupAdd(accountOne, 4, {from: accountTen});
        // mint 1500 ITR to manager
        await TradedTokenContractMockInstance.mint(accountOne, BigNumber(1500*1e18), {from: accountTen});
        // setup whitelistReduce value into 1 day
        await this.TransferRulesInstance.whitelistReduce(1, {from: accountTen});
        
        // transfer 500ITR to whitelist person
        await TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne})
        // transfer 500ITR to none-whitelist person
        await TradedTokenContractMockInstance.transfer(accountThree, BigNumber(500*1e18), {from: accountOne})

        // revert all: none-whitelist and whitelist person
        await truffleAssert.reverts(
            TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountTwo}), 
            "Transfer not authorized"
        );
        await truffleAssert.reverts(
            TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountThree}), 
            "Transfer not authorized"
        );
        
        // pass 1 days
        await helper.advanceTimeAndBlock(1*duration1Day);
        
        // revert for none-whitelist person only
        await TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountTwo});
        await truffleAssert.reverts(
            TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountThree}), 
            "Transfer not authorized"
        );
        
        // pass 3 days
        await helper.advanceTimeAndBlock(3*duration1Day);
        // in total passed 4 days  so tokens will be available for none-whitelist person
        await TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountThree});
        
        t = await this.TransferRulesInstance.minimumsView(accountFourth, {from: accountFourth});
        assert.equal(t[0].toString(), BigNumber(0).toString(), ' minimums are not equal zero for accountFourth');
        assert.equal(t[1].toString(), BigNumber(0).toString(), ' minimums(gradual) are not equal zero for accountFourth');
        
        t = await TradedTokenContractMockInstance.balanceOf(accountFourth, {from: accountFourth});
        assert.equal(BigNumber(t).toString(), BigNumber(1000*1e18).toString(), 'Balance for accountFourth are wrong');
            
    });
  
    it('testing minimums', async () => {
        let latestBlockInfo;
        
        var TradedTokenContractMockInstance = await TradedTokenContractMock.new({from: accountTen});
		await TradedTokenContractMockInstance.initialize(name, symbol, defaultOperators, {from: accountTen});
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        // _updateRestrictionsAndRules     
        await TradedTokenContractMockInstance._updateRestrictionsAndRules(this.TransferRulesInstance.address, {from: accountTen});
        
        //------- #1
        //mint accountOne 500ITR
        await TradedTokenContractMockInstance.mint(accountOne, BigNumber(500*1e18), {from: accountTen});
        
        latestBlockInfo = await web3.eth.getBlock("latest");
        
        await this.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500*1e18), latestBlockInfo.timestamp + duration1Day, true, {from: accountTen});
        
        await truffleAssert.reverts(
            TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne}), 
            "Transfer not authorized"
        );
        
        // pass 1 days
        await helper.advanceTimeAndBlock(1*duration1Day);
        // try again
        await TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne});
    
        //------- #2
        //mint accountOne 500ITR
        await TradedTokenContractMockInstance.mint(accountOne, BigNumber(500*1e18), {from: accountTen});
        
        latestBlockInfo = await web3.eth.getBlock("latest");
        
        await this.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500*1e18), latestBlockInfo.timestamp + duration1Day, true, {from: accountTen});
        
        await truffleAssert.reverts(
            TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne}), 
            "Transfer not authorized"
        );
        // remove minimums
        await this.TransferRulesInstance.minimumsClear(accountOne, {from: accountTen});
        
        // try again (so without passing 1 day)
        await TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne});
        
    });
    

    it('test dailyRate', async () => {
        var TradedTokenContractMockInstance = await TradedTokenContractMock.new({from: accountTen});
		await TradedTokenContractMockInstance.initialize(name, symbol, defaultOperators, {from: accountTen});
        // var TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        // await TransferRulesInstance.init({from: accountTen});
        
        // _updateRestrictionsAndRules     
        await TradedTokenContractMockInstance._updateRestrictionsAndRules(this.TransferRulesInstance.address, {from: accountTen});
        
        //------- #1
        //mint accountOne 500ITR
        await TradedTokenContractMockInstance.mint(accountOne, BigNumber(500*1e18), {from: accountTen});
        
        
        await truffleAssert.reverts(
            this.TransferRulesInstance.dailyRate(BigNumber(500*1e18), 1, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        
        await this.TransferRulesInstance.dailyRate(BigNumber(100*1e18), 1, {from: accountTen});
        
        await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(200*1e18), "Iteration#1");
        
        // await truffleAssert.reverts(
        //     sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(200*1e18), "Iteration#1"), 
        //     "Transfer not authorized"
        // );
        
        // await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#2"), 
        // await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#3"), 
        
        // await truffleAssert.reverts(
        //     sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#4"), 
        //     "Transfer not authorized"
        // );
        
        // // pass 1 days
        // await helper.advanceTimeAndBlock(1*duration1Day);
        
        // await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#2"); 
        // await sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#3"); 
        
        // await truffleAssert.reverts(
        //     sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#4"), 
        //     "Transfer not authorized"
        // );

    });


    it('summary transactions cost', async () => {
        
        //
        console.table(await helperCostEth.getTransactionsCostEth(90, false));
        //console.table(await helperCostEth.getTransactionsCostEth(90, true));
        
    });

  /**/
});