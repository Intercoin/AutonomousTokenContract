const BigNumber = require('bignumber.js');
const util = require('util');

const TransferRulesMock = artifacts.require("TransferRulesMock");
//const ExternalItrImitationMock = artifacts.require("ExternalItrImitationMock");
const TradedTokenContractMock = artifacts.require("TradedTokenContractMock");

const uniswapV2Router = artifacts.require("IUniswapV2Router02");
const uniswapPair = artifacts.require("IUniswapV2Pair");
const IERC20Upgradeable = artifacts.require("IERC20Upgradeable");


const truffleAssert = require('truffle-assertions');
const helper = require("../helpers/truffleTestHelper");

const helperCostEth = require("../helpers/transactionsCost");
const helperCommon = require("../helpers/common");

require('@openzeppelin/test-helpers/configure')({ web3 });
const { singletons } = require('@openzeppelin/test-helpers');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

contract('TradedTokenContract, TransferRules and PancakeSwap', (accounts) => {

    // Setup accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];
    const accountThree = accounts[2];
    const accountFourth = accounts[3];
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
    var presalePrice = 100000;
    var poolPrice = 100000;
    const predefinedBalances = [];

    
    var buyTax = [
        10, 
        10, 
        10,
        10,
    ];
    //var sellTax = [100, 10, 10];
    var sellTax = [
        10, 
        20, 
        10
    ];
    
    var transfer = [0, 10, 0];
    var progressive = [5, 100, 3600];
    var disbursementList = [[accountNine, 60], [accountTen, 40]];

    const duration1Day = 86_400;       // 1 year
    const durationLockupUSAPerson = 31_536_000;       // 1 year
    const durationLockupNoneUSAPerson = 3_456_000;    // 40 days

    const ts2050y = 2525644800;

    var erc1820;


    // temp vars used at compare status and variables
    let tmp, tmpBool, tmpBool2, tmpBalance, tmpCounter, trTmp;

    helperCostEth.transactionsClear();

    var TransferRulesInstance;
    /* */
    beforeEach(async () => {
        erc1820 = await singletons.ERC1820Registry(accountNine);

        //TransferRulesInstance = await deployProxy(TransferRulesMock);
        this.TransferRulesInstance = await TransferRulesMock.new({ from: accountTen });
        await this.TransferRulesInstance.init({ from: accountTen });

        this.TradedTokenContractMockInstance = await TradedTokenContractMock.new({ from: accountTen });
        await this.TradedTokenContractMockInstance.initialize(name, symbol, defaultOperators, presalePrice, predefinedBalances, buyTax, sellTax, transfer, progressive, disbursementList, { from: accountTen });
        
        await this.TradedTokenContractMockInstance.donateETH({ from: accountTen, value: '0x' + BigNumber(150e18).toString(16) });
        await this.TradedTokenContractMockInstance.startPool(poolPrice, { from: accountTen });

        let uniswapV2RouterAddr = await this.TradedTokenContractMockInstance.uniswapV2Router();
        let uniswapV2PairAddr = await this.TradedTokenContractMockInstance.uniswapV2Pair();
        this.uniswapV2RouterInstance = await uniswapV2Router.at(uniswapV2RouterAddr);
        this.uniswapV2PairInstance = await uniswapPair.at(uniswapV2PairAddr);

        this.WETHAddr = await this.uniswapV2RouterInstance.WETH();
        this.token0 = await this.uniswapV2PairInstance.token0();
        this.token1 = await this.uniswapV2PairInstance.token1();
        this.pathETHToken = [
            (this.WETHAddr == this.token1 ? this.token1 : this.token0),
            (this.WETHAddr == this.token1 ? this.token0 : this.token1)
        ];
        this.pathTokenETH = [
            (this.WETHAddr == this.token1 ? this.token0 : this.token1),
            (this.WETHAddr == this.token1 ? this.token1 : this.token0)
        ];
        this.WETHInstance = await IERC20Upgradeable.at((this.WETHAddr == this.token1 ? this.token1 : this.token0));


 
    });


    it('create and initialize', async () => {
        let objThis = this;

        helperCostEth.transactionPush(objThis.TransferRulesInstance, 'TransferRulesInstance::new');

    });

    it('setERC test', async () => {
        let objThis = this;

        // _updateRestrictionsAndRules     
        trTmp = await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(zeroAddr, { from: accountTen });
        helperCostEth.transactionPush(trTmp, '_updateRestrictionsAndRules');

        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, { from: accountTen });
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, { from: accountTen }),
            'external contract already set'
        );

    });

    it('owner can manage role `managers`', async () => {
        let objThis = this;

        await truffleAssert.reverts(
            objThis.TransferRulesInstance.managersAdd([accountOne], { from: accountFive }),
            "Ownable: caller is not the owner"
        );
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.managersRemove([accountOne], { from: accountFive }),
            "Ownable: caller is not the owner"
        );

        let managersGroupName = await objThis.TransferRulesInstance.getManagersGroupName({ from: accountTen });

        trTmp = await objThis.TransferRulesInstance.managersAdd([accountOne], { from: accountTen });
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::managersAdd');
        tmpBool = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, { from: accountTen });
        assert.equal(tmpBool, true, 'could not add manager');

        trTmp = await objThis.TransferRulesInstance.managersRemove([accountOne], { from: accountTen });
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::managersRemove');
        tmpBool = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, { from: accountTen });
        assert.equal(tmpBool, false, 'could not remove manager');


        // remove from list if none exist before
        tmpBool = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountTwo, { from: accountTen });
        await objThis.TransferRulesInstance.managersRemove([accountTwo], { from: accountTen });
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountTwo, { from: accountTen });
        assert.equal(tmpBool, tmpBool2, 'removing manager from list if none exist before went wrong');

        // add to list if already exist
        await objThis.TransferRulesInstance.managersAdd([accountOne], { from: accountTen });
        tmpBool = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, { from: accountTen });
        await objThis.TransferRulesInstance.managersAdd([accountOne], { from: accountTen });
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, { from: accountTen });
        assert.equal(tmpBool, tmpBool2, 'adding manager list if already exist went wrong');

    });

    it('managers can add/remove person to whitelist', async () => {
        let objThis = this;

        await truffleAssert.reverts(
            objThis.TransferRulesInstance.whitelistAdd([accountTwo], { from: accountOne }),
            "Sender is not in whitelist"
        );

        //owner can't add into whitelist if he will not add himself to managers list
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.whitelistAdd([accountTwo], { from: accountTen }),
            "Sender is not in whitelist"
        );

        await objThis.TransferRulesInstance.managersAdd([accountOne], { from: accountTen });

        tmpBool = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, { from: accountTen });
        trTmp = await objThis.TransferRulesInstance.whitelistAdd([accountTwo], { from: accountOne });
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::whitelistAdd');
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, { from: accountTen });
        assert.equal(((tmpBool != tmpBool2) && tmpBool2 == true), true, 'could add person to whitelist');

        tmpBool = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, { from: accountTen });
        trTmp = await objThis.TransferRulesInstance.whitelistRemove([accountTwo], { from: accountOne });
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::whitelistRemove');
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, { from: accountTen });
        assert.equal(((tmpBool != tmpBool2) && tmpBool2 == false), true, 'could add person to whitelist');
        //---------
        // remove from list if none exist before
        tmpBool = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, { from: accountTen });
        await objThis.TransferRulesInstance.whitelistRemove([accountTwo], { from: accountOne });
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, { from: accountTen });
        assert.equal(tmpBool, tmpBool2, 'removing person from list if none exist before, went wrong');

        // add to list if already exist
        await objThis.TransferRulesInstance.whitelistAdd([accountTwo], { from: accountOne });
        tmpBool = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, { from: accountTen });
        await objThis.TransferRulesInstance.whitelistAdd([accountTwo], { from: accountOne });
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, { from: accountTen });
        assert.equal(tmpBool, tmpBool2, 'adding person to whitelist if already exist, went wrong');

    });

    it('should no restrictions after deploy', async () => {
        let objThis = this;

        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(zeroAddr, { from: accountTen });

        // create managers
        await objThis.TransferRulesInstance.managersAdd([accountOne], { from: accountTen });
        await objThis.TransferRulesInstance.managersAdd([accountTwo], { from: accountTen });

        // create whitelist persons
        await objThis.TransferRulesInstance.whitelistAdd([accountThree], { from: accountOne });
        await objThis.TransferRulesInstance.whitelistAdd([accountFourth], { from: accountTwo });


        let arr = [accountOne, accountTwo, accountThree, accountFourth];
        // mint to all accounts 1000 ITR
        // and to itself(owner) too
        for (var i = 0; i < arr.length; i++) {
            await objThis.TradedTokenContractMockInstance.mint(arr[i], BigNumber(1000 * 1e18), { from: accountTen });
            // check Balance
            tmpBalance = await objThis.TradedTokenContractMockInstance.balanceOf(arr[i]);
            assert.equal(
                (BigNumber(1000 * 1e18)).toString(),
                (BigNumber(tmpBalance)).toString(),
                "wrong balance for account " + arr[i]
            )
        }

        // try to send 10ITR and send back 40ITR for each account
        // make a not that taxed does not applied for regular transfer (not unswappair, not address(this))
        tmpCounter = 0;
        for (var i = 0; i < arr.length; i++) {
            for (var j = 0; j < arr.length; j++) {
                // except from itself to itself
                if (arr[i] != arr[j]) {
                    tmpCounter++;

                    await helperCommon.sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, arr[i], arr[j], BigNumber(10 * 1e18), "Iteration#" + tmpCounter + " (sendTo)");
                    await helperCommon.sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, arr[j], arr[i], BigNumber(40 * 1e18), "Iteration#" + tmpCounter + " (sendBack)");
                }
            }
        }

    });

    it('automaticLockup should call only by owner', async () => {
        let objThis = this;

        await truffleAssert.reverts(
            objThis.TransferRulesInstance.automaticLockupAdd(accountOne, 5, { from: accountFive }),
            "Ownable: caller is not the owner"
        );
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.automaticLockupRemove(accountOne, { from: accountFive }),
            "Ownable: caller is not the owner"
        );

        trTmp = await objThis.TransferRulesInstance.automaticLockupAdd(accountOne, 5, { from: accountTen });
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::automaticLockupAdd');
        trTmp = await objThis.TransferRulesInstance.automaticLockupRemove(accountOne, { from: accountTen });
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::automaticLockupRemove');
    });

    it('minimums should call only by owner', async () => {
        let objThis = this;

        let latestBlockInfo = await web3.eth.getBlock("latest");

        await truffleAssert.reverts(
            objThis.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500 * 1e18), latestBlockInfo.timestamp + duration1Day, true, { from: accountFive }),
            "Ownable: caller is not the owner"
        );
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.minimumsClear(accountOne, { from: accountFive }),
            "Ownable: caller is not the owner"
        );

        trTmp = await objThis.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500 * 1e18), latestBlockInfo.timestamp + duration1Day, true, { from: accountTen });
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::minimumsAdd');
        trTmp = await objThis.TransferRulesInstance.minimumsClear(accountOne, { from: accountTen });
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::minimumsClear');
    });

    it('testing automaticLockup', async () => {
        let objThis = this;


        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, { from: accountTen });

        //mint accountOne 1000ITR
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(1500 * 1e18), { from: accountTen });

        // be sure that accountOne can send to someone without lockup limit
        await helperCommon.sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountOne, accountTwo, BigNumber(500 * 1e18), "Iteration#1");
        await helperCommon.sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountTwo, accountThree, BigNumber(500 * 1e18), "Iteration#2");

        // setup automatic lockup for accountOne for 1 day
        await objThis.TransferRulesInstance.automaticLockupAdd(accountOne, 1, { from: accountTen });
        // check lockup exist
        tmp = await objThis.TransferRulesInstance.getLockup(accountOne, { from: accountTen });
        assert.equal(tmp[0].toString(), (BigNumber(1).times(BigNumber(86400))).toString(), 'duration lockup was set wrong');
        assert.equal(tmp[1], true, 'duration lockup was set wrong');


        // send to accountFourth
        await helperCommon.sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(500 * 1e18), "Iteration#3");
        // try to send 500 ITR tokens from accountFourth to accountFive
        // expecting that tokens will be lock for accountFourth for 1 day

        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountFive, BigNumber(500 * 1e18), { from: accountFourth }),
            "Transfer not authorized"
        );

        tmpBool = await objThis.TransferRulesInstance.authorize(accountFourth, accountFive, BigNumber(500 * 1e18), { from: accountFourth });
        assert.equal(tmpBool, false, 'emsg `Transfer not authorized` does not emit');


        // pass 1 days
        await helper.advanceTimeAndBlock(1 * duration1Day);


        // and try again
        await helperCommon.sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountFourth, accountFive, BigNumber(500 * 1e18), "Iteration#4");


        ///// 
        // remove automaticLockup from accountOne
        await objThis.TransferRulesInstance.automaticLockupRemove(accountOne, { from: accountTen });
        // send to accountFourth another 500 ITR
        await helperCommon.sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(500 * 1e18), "Iteration#5");
        // expecting that the tokens doesnot locked up and transfered w/out reverts
        await objThis.TradedTokenContractMockInstance.transfer(accountFive, BigNumber(500 * 1e18), { from: accountFourth });

    });

    it('whitelistReduce should reduce locked time for whitelist persons', async () => {
        let objThis = this;

        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, { from: accountTen });

        // owner adding manager 
        await objThis.TransferRulesInstance.managersAdd([accountOne], { from: accountTen });
        // manager adding person into whitelist
        await objThis.TransferRulesInstance.whitelistAdd([accountTwo], { from: accountOne });

        // setup 4 days locked up for manager
        await objThis.TransferRulesInstance.automaticLockupAdd(accountOne, 4, { from: accountTen });
        // mint 1500 ITR to manager
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(1500 * 1e18), { from: accountTen });
        // setup whitelistReduce value into 1 day
        await objThis.TransferRulesInstance.whitelistReduce(1, { from: accountTen });

        // transfer 500ITR to whitelist person
        await objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500 * 1e18), { from: accountOne })
        // transfer 500ITR to none-whitelist person
        await objThis.TradedTokenContractMockInstance.transfer(accountThree, BigNumber(500 * 1e18), { from: accountOne })

        // revert all: none-whitelist and whitelist person
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500 * 1e18), { from: accountTwo }),
            "Transfer not authorized"
        );
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500 * 1e18), { from: accountThree }),
            "Transfer not authorized"
        );

        // pass 1 days
        await helper.advanceTimeAndBlock(1 * duration1Day);

        // revert for none-whitelist person only
        await objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500 * 1e18), { from: accountTwo });
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500 * 1e18), { from: accountThree }),
            "Transfer not authorized"
        );

        // pass 3 days
        await helper.advanceTimeAndBlock(3 * duration1Day);
        // in total passed 4 days  so tokens will be available for none-whitelist person
        await objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500 * 1e18), { from: accountThree });

        t = await objThis.TransferRulesInstance.minimumsView(accountFourth, { from: accountFourth });
        assert.equal(t[0].toString(), BigNumber(0).toString(), ' minimums are not equal zero for accountFourth');
        assert.equal(t[1].toString(), BigNumber(0).toString(), ' minimums(gradual) are not equal zero for accountFourth');

        t = await objThis.TradedTokenContractMockInstance.balanceOf(accountFourth, { from: accountFourth });
        assert.equal(BigNumber(t).toString(), BigNumber(1000 * 1e18).toString(), 'Balance for accountFourth are wrong');

    });

    it('testing minimums', async () => {

        let objThis = this;
        let latestBlockInfo;

        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(this.TransferRulesInstance.address, { from: accountTen });

        //------- #1
        //mint accountOne 500ITR
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(500 * 1e18), { from: accountTen });

        latestBlockInfo = await web3.eth.getBlock("latest");

        await objThis.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500 * 1e18), latestBlockInfo.timestamp + duration1Day, true, { from: accountTen });

        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500 * 1e18), { from: accountOne }),
            "Transfer not authorized"
        );

        // pass 1 days
        await helper.advanceTimeAndBlock(1 * duration1Day);
        // try again
        await objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500 * 1e18), { from: accountOne });

        //------- #2
        //mint accountOne 500ITR
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(500 * 1e18), { from: accountTen });

        latestBlockInfo = await web3.eth.getBlock("latest");

        await objThis.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500 * 1e18), latestBlockInfo.timestamp + duration1Day, true, { from: accountTen });

        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500 * 1e18), { from: accountOne }),
            "Transfer not authorized"
        );
        // remove minimums
        await objThis.TransferRulesInstance.minimumsClear(accountOne, { from: accountTen });

        // try again (so without passing 1 day)
        await objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500 * 1e18), { from: accountOne });

    });

    it('test dailyRate', async () => {
        let objThis = this;

        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, { from: accountTen });

        //------- #1
        //mint accountOne 500ITR
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(500 * 1e18), { from: accountTen });


        await truffleAssert.reverts(
            objThis.TransferRulesInstance.dailyRate(BigNumber(500 * 1e18), 1, { from: accountFive }),
            "Ownable: caller is not the owner"
        );

        await objThis.TransferRulesInstance.dailyRate(BigNumber(100 * 1e18), 1, { from: accountTen });

        await helperCommon.sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(200 * 1e18), "Iteration#1");

        // await truffleAssert.reverts(
        //     helperCommon.sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(200*1e18), "Iteration#1"), 
        //     "Transfer not authorized"
        // );

        // await helperCommon.sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#2"), 
        // await helperCommon.sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#3"), 

        // await truffleAssert.reverts(
        //     helperCommon.sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#4"), 
        //     "Transfer not authorized"
        // );

        // // pass 1 days
        // await helper.advanceTimeAndBlock(1*duration1Day);

        // await helperCommon.sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#2"); 
        // await helperCommon.sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#3"); 

        // await truffleAssert.reverts(
        //     helperCommon.sendAndCheckCorrectBalance(TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(50*1e18), "Iteration#4"), 
        //     "Transfer not authorized"
        // );

    });

    

    /* 
        //if need to view transaction cost consuming while tests
        it('summary transactions cost', async () => {
            console.table(await helperCostEth.getTransactionsCostEth(90, false));
        });
    
      */
});