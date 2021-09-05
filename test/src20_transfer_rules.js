const BigNumber = require('bignumber.js');
const util = require('util');

const MockSRC20 = artifacts.require("MockSRC20");
const MockRule1 = artifacts.require("MockRule1");
const MockRule2 = artifacts.require("MockRule2");
const MockRule3 = artifacts.require("MockRule3");

const truffleAssert = require('truffle-assertions');
const helper = require("../helpers/truffleTestHelper");

const helperCostEth = require("../helpers/transactionsCost");
const helperCommon = require("../helpers/common");

require('@openzeppelin/test-helpers/configure')({ web3 });

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

contract('SRC20 TransferRules', (accounts) => {

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
        this.MockSRC20Instance = await MockSRC20.new({ from: accountTen });
        
        this.MockSRC20Instancemint(accountOne,100);
        this.MockSRC20Instancemint(accountTwo,100);
        this.MockSRC20Instancemint(accountThree,100);
        this.MockSRC20Instancemint(accountFourth,100);
        this.MockSRC20Instancemint(accountFive,100);
        
        this.MockRule1Instance = await MockRule1.new({ from: accountTen });
        this.MockRule2Instance = await MockRule2.new({ from: accountTen });
        this.MockRule3Instance = await MockRule3.new({ from: accountTen });
        await this.MockRule1Instance.init({ from: accountTen });
        await this.MockRule2Instance.init({ from: accountTen });
        await this.MockRule3Instance.init({ from: accountTen });


    });



    it('test', async () => {
        let objThis = this;
        let balanceBefore1,balanceBefore2,balanceAfter1,balanceAfter1;

        // _updateRestrictionsAndRules     
        trTmp = await objThis.MockSRC20Instance._updateRestrictionsAndRules(zeroAddr, objThis.MockRule1Instance.address, { from: accountTen });
        helperCostEth.transactionPush(trTmp, '_updateRestrictionsAndRules');

        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.MockRule2Instance.address, { from: accountTen }),
            'SRC20 contract already set in transfer rules'
        );
        
        balanceBefore1 = await objThis.MockSRC20Instance.balanceOf(accountOne);
        balanceBefore2 = await objThis.MockSRC20Instance.balanceOf(accountTwo);
        await objThis.MockSRC20Instance.transfer(accountOne, accountTwo, 2);
        balanceAfter1 = await objThis.MockSRC20Instance.balanceOf(accountOne);
        balanceAfter2 = await objThis.MockSRC20Instance.balanceOf(accountTwo);
        assert.equal(
                (
                    BigNumber(balanceBefore1).sub(BigNumber(balanceAfter1))
                    ).toString(),
                (BigNumber(tmpBalance)).toString(),
                "wrong balance for account " + arr[i]
            )
    });

    

    /* 
        //if need to view transaction cost consuming while tests
        it('summary transactions cost', async () => {
            console.table(await helperCostEth.getTransactionsCostEth(90, false));
        });
    
      */
});