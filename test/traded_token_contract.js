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

contract('TradedTokenContract and PancakeSwap', (accounts) => {

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
    var ownersList = [[accountNine, 60], [accountTen, 40]];

    const duration1Day = 86_400;       // 1 year
    const durationLockupUSAPerson = 31_536_000;       // 1 year
    const durationLockupNoneUSAPerson = 3_456_000;    // 40 days

    const ts2050y = 2525644800;

    var erc1820;


    // temp vars used at compare status and variables
    let tmp, tmpBool, tmpBool2, tmpBalance, tmpCounter, trTmp;


    async function statsView(objThis) {

        // console.log('================================');
        //  console.log('price0CumulativeLast           =', (await objThis.uniswapV2PairInstance.price0CumulativeLast()).toString());
        // console.log('price1CumulativeLast           =', (await objThis.uniswapV2PairInstance.price1CumulativeLast()).toString());
        let tmp = await objThis.uniswapV2PairInstance.getReserves();
        let price,priceToken,priceETH;
        console.log('getReserves[reserve0]          =', (tmp.reserve0).toString());
        console.log('getReserves[reserve1]          =', (tmp.reserve1).toString());
        //console.log('tmp.reserve1/tmp.reserve0      =', (tmp.reserve1/tmp.reserve0).toString());
        if (objThis.WETHAddr == objThis.token0) {
            priceToken = tmp.reserve0 / tmp.reserve1;
            priceETH = tmp.reserve1 / tmp.reserve0;
        } else {
            priceToken = tmp.reserve1 / tmp.reserve0;
            priceETH = tmp.reserve0 / tmp.reserve1;
        }
        
        console.log('priceToken =', (priceToken).toString());
        console.log('priceETH =', (priceETH).toString());
        
        // console.log('getReserves[blockTimestampLast]=', (tmp.blockTimestampLast).toString());
        /**/
                // console.log('=WETH======================');
                // console.log('accountOne(WETH)  =', (await objThis.WETHInstance.balanceOf(accountOne)).toString());
                // console.log('Pair(WETH)        =', (await objThis.WETHInstance.balanceOf(objThis.uniswapV2PairInstance.address)).toString());
                // console.log('ITRContract(WETH) =', (await objThis.WETHInstance.balanceOf(objThis.TradedTokenContractMockInstance.address)).toString());
                // console.log('=ETH======================');
                // console.log('accountOne(ETH)   =', (await web3.eth.getBalance(accountOne)).toString());	    
                // console.log('Pair(ETH)         =', (await web3.eth.getBalance(objThis.uniswapV2PairInstance.address)).toString());
                console.log('ITRContract(ETH)  =', (await web3.eth.getBalance(objThis.TradedTokenContractMockInstance.address)).toString());	    
                // console.log('=ITR======================');
                // console.log('accountOne(ITR)   =', (await objThis.TradedTokenContractMockInstance.balanceOf(accountOne)).toString());
                // console.log('Pair(ITR)         =', (await objThis.TradedTokenContractMockInstance.balanceOf(objThis.uniswapV2PairInstance.address)).toString());
                console.log('ITRContract(ITR)  =', (await objThis.TradedTokenContractMockInstance.balanceOf(objThis.TradedTokenContractMockInstance.address)).toString());
                // console.log('=======================');
                // console.log('accountOne(CAKE)  =', (await objThis.uniswapV2PairInstance.balanceOf(accountOne)).toString());
                // console.log('Pair(CAKE)        =', (await objThis.uniswapV2PairInstance.balanceOf(objThis.uniswapV2PairInstance.address)).toString());
                // console.log('ITRContract(CAKE) =', (await objThis.uniswapV2PairInstance.balanceOf(objThis.TradedTokenContractMockInstance.address)).toString());
        /**/
        // console.log('================================');
    }


    var TransferRulesInstance;
    /* */
    beforeEach(async () => {
        erc1820 = await singletons.ERC1820Registry(accountNine);

        //TransferRulesInstance = await deployProxy(TransferRulesMock);
        this.TransferRulesInstance = await TransferRulesMock.new({ from: accountTen });
        await this.TransferRulesInstance.init({ from: accountTen });

        this.TradedTokenContractMockInstance = await TradedTokenContractMock.new({ from: accountTen });
        await this.TradedTokenContractMockInstance.initialize(name, symbol, defaultOperators, predefinedBalances, buyTax, sellTax, transfer, progressive, ownersList, { from: accountTen });
        
        await this.TradedTokenContractMockInstance.donateETH({ from: accountTen, value: '0x' + BigNumber(150e18).toString(16) });
        await this.TradedTokenContractMockInstance.setInitialPrice(100000, { from: accountTen });

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
    
    it('check initialize', async () => {
    });
    
    /*
    it('simulation', async () => {

        var objThis = this;

        await statsView(objThis);

        let accountsArr = [accountOne, accountTwo, accountThree, accountFourth, accountFive, accountSix, accountSeven, accountEight];
        //let accountsArr = [accountOne, accountTwo];
        
        let ITRContractBalanceBefore = await objThis.TradedTokenContractMockInstance.balanceOf(objThis.TradedTokenContractMockInstance.address);

        let iterationCounts = 20,
            errorsHappened = 0,
            i = 0,
            accountRandomIndex,
            typeTodo,
            totalBalance,
            amount2Send
            ;
        
        let tmp;
        let priceToken;
        let priceETH;
        
        function toStr(element) {
          return element.toString();
        }       

        while (i < iterationCounts) {



            try {
                console.log("--- iteration begin -#"+i+"--------");
                tmp = await objThis.uniswapV2PairInstance.getReserves();
                if (objThis.WETHAddr == objThis.token0) {
                    priceToken = tmp.reserve0 / tmp.reserve1;
                    priceETH = tmp.reserve1 / tmp.reserve0;
                } else {
                    priceToken = tmp.reserve1 / tmp.reserve0;
                    priceETH = tmp.reserve0 / tmp.reserve1;
                }
                
                console.log('priceToken =', (priceToken).toString());
                console.log('priceETH =', (priceETH).toString());
            
                accountRandomIndex = Math.floor(Math.random() * accountsArr.length);
                typeTodo = Math.floor(Math.random() * 2);
                console.log('accountRandomIndex =', accountRandomIndex);
                console.log('typeTodo           =', typeTodo);
                

//                await statsView(objThis);
//typeTodo = 0;
                if (typeTodo == 0) {
                    i++;
                    // swapExactETHForTokens
                    //totalBalance = await web3.eth.getBalance(accountOne);
                    amount2Send = Math.floor(Math.random() * 10 ** 21);

                    //console.log("-------------------------");
                    console.log("swapExactETHForTokens");
                    console.log("amount2Send(eth)  = ", amount2Send.toString());
                    // console.log("before(ITR) = ", (await objThis.TradedTokenContractMockInstance.balanceOf(accountsArr[accountRandomIndex])).toString());
                    await objThis.uniswapV2RouterInstance.swapExactETHForTokens(
                        // '0x' + BigNumber(amount2Send).toString(16),
                        0,
                        objThis.pathETHToken,
                        accountsArr[accountRandomIndex],
                        ts2050y, { from: accountsArr[accountRandomIndex], value: '0x' + BigNumber(amount2Send).toString(16) }
                    );
                    
                    // console.log("After(ITR) = ", (await objThis.TradedTokenContractMockInstance.balanceOf(accountsArr[accountRandomIndex])).toString());
                    console.log('latestPrice=', (await objThis.TradedTokenContractMockInstance.getLatestPrice()).toString());
                    tmp = await objThis.TradedTokenContractMockInstance.getttt();
                    console.log('_currentSellPrice =', tmp[0].toString());
                    console.log('_lastMaxSellPrice =', tmp[1].toString());
                } else {
                    // swap back
                    totalBalance = await objThis.TradedTokenContractMockInstance.balanceOf(accountsArr[accountRandomIndex]);
                    amount2Send = 0;
                    if (totalBalance > 0) {
                        amount2Send = Math.floor(Math.random() * 10 ** (totalBalance.toString().length - 1));
                        if (totalBalance > amount2Send) {
                            i++;
                            //console.log("-------------------------");
                            console.log("swapExactTokensForETH");
                            console.log("totalBalanceaccountsArr["+accountRandomIndex+"] = ", totalBalance.toString());
                            console.log("amount2Send  = ", amount2Send.toString());
                            // console.log("before(ITR) = ", (await objThis.TradedTokenContractMockInstance.balanceOf(accountsArr[accountRandomIndex])).toString());

                            await objThis.TradedTokenContractMockInstance.approve(objThis.uniswapV2RouterInstance.address, '0x' + BigNumber(amount2Send).toString(16), { from: accountsArr[accountRandomIndex] });
    
                            await objThis.uniswapV2RouterInstance.swapExactTokensForETH(
                                '0x' + BigNumber(amount2Send).toString(16),
                                0, // accept any amount of ETH 
                                objThis.pathTokenETH,
                                accountsArr[accountRandomIndex],
                                ts2050y, { from: accountsArr[accountRandomIndex] }
                            );
                                      
                            await statsView(objThis);
                            // console.log("After(ITR) = ", (await objThis.TradedTokenContractMockInstance.balanceOf(accountsArr[accountRandomIndex])).toString());
                            console.log('latestPrice=', (await objThis.TradedTokenContractMockInstance.getLatestPrice()).toString());
                        } else {
                            
                            // console.log('totalBalance=', (totalBalance).toString());
                            // console.log('amount2Send =', (amount2Send).toString());
                        }
                    } else {
                        //console.log("totalBalance==0");    
                        // console.log('totalBalance=', (totalBalance).toString());
                        // console.log('amount2Send =', (amount2Send).toString());    
                        continue;
                    }
                    

                }

                await statsView(objThis);
                // try to correct price externally after each iteration
                await objThis.TradedTokenContractMockInstance.correctPrices({ from: accountTen });
                
            }
            catch (e) {
                console.log(e);
                console.log('catch error');
                errorsHappened ++;
                if (typeTodo == 0) {
                    //console.log("-------------------------");
                    console.log("swapExactETHForTokens");
                    console.log("amount2Send  = ", amount2Send.toString());
                    console.log("before = ", (await objThis.TradedTokenContractMockInstance.balanceOf(accountsArr[accountRandomIndex])).toString());
                } else {
                    //console.log("-------------------------");
                    console.log("swapExactTokensForETH");
                    console.log("amount2Send  = ", amount2Send.toString());
                    console.log("before = ", (await objThis.TradedTokenContractMockInstance.balanceOf(accountsArr[accountRandomIndex])).toString());
                }
                                
                await statsView(objThis);
                continue;
                //process.exit(1);
            }
            
            
        }
        //await statsView(objThis);
        
        
        let ITRContractBalanceAfter = await objThis.TradedTokenContractMockInstance.balanceOf(objThis.TradedTokenContractMockInstance.address);
        console.log('latestPrice=', (await objThis.TradedTokenContractMockInstance.getLatestPrice()).toString());
        console.log("Total Iteractions = ", i);
        console.log("Errors Happened   = ", errorsHappened);
        // console.log('ITRContractBalanceBefore=', ITRContractBalanceBefore.toString());
        // console.log('ITRContractBalanceAfter =', ITRContractBalanceAfter.toString());

    });
    */
});