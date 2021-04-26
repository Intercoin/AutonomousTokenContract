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

require('@openzeppelin/test-helpers/configure')({ web3 });
const { singletons } = require('@openzeppelin/test-helpers');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

contract('TradedTokenContract, TransferRules and PancakeSwap', (accounts) => {
    
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
    const predefinedBalances = [["0x001b9e1c869f307469cccfa5c5be4476436d65fb", "62502000000000000000000"], ["0x02a9e8495c2f2cb526eaa83227310c36f0800b52", "1667000000000000000000"], ["0x02eb35615f6d58faedd1f7f333639e9390b98149", "3334000000000000000000"], ["0x04c30beae769ea53b4343cfc549c7f0f77b72549", "6666666720000000000000000"], ["0x067be8b2e19e5521f62aad2224e8ea50ac47b087", "734585000000000000000000"], ["0x1c250e098fa2901918b430c3e84fee435f8d9fe9", "77777000000000000000000"], ["0x1d4e215701f6fc28d821d3d69e0c9bfd63d00ca6", "223000000000000000000"], ["0x2073bb732f646c7d96f293cf23f7098d3c2db6e0", "1200000000000000000000"], ["0x2623c55b9a58c4f2e94e76ac593f8382640dc79f", "10000000000000000000"], ["0x2800ab73c895e2c2be56ed337487428677116350", "4000000000000000000000000"], ["0x2e4c5c4b0b7c6b8c02d3c30cb59629d01ec8f074", "49963500000000000000000"], ["0x3077621ab7e7b06ddeb1ae75b1f2fb0360f54641", "5500010000000000000000000"], ["0x33eb6487e9973ac43e7a35be808067b0f333c9c5", "10000000000000000000000"], ["0x39a42b1ff06d991cb0dc23036e487247ad1695ab", "7000000000000000000"], ["0x3cb90aeb17f1b3812e73c7c34d8db83580781ef8", "2000000000000000000000"], ["0x3d11174162b04fe7c56be0e46856377e623defc1", "3835000000000000000000"], ["0x3ec1440b81c55cb7646491a7187710512a7f4b19", "66258226595000000000000000"], ["0x3f4ea310afadb0bc4325aa1191402f18fd1e2ebb", "50667000000000000000000"], ["0x400fc1628d12f342c40ce639250ff4417aeb9378", "1000000000000000000"], ["0x40711b63db79a5e8579bd53f84c5c558e856f806", "66667000000000000000000"], ["0x41ed9e2b8185ad0695b269efc5f36019fe74912b", "8335000000000000000000"], ["0x4201a99d13f496a313ee1587abcc6100715f1034", "30000000000000000000000"], ["0x448f9e8c51719560b121fbdebf69e0eb950b5c7f", "1000000000000000000"], ["0x4641c79d1d39958bbdbddb0464aa24c1a7167fb2", "2928094000000000000000000"], ["0x4ff4781787c65690acbb5279257087ebf1b9c491", "376000000000000000000000"], ["0x5012af9ee08f92e5e5e996d1e41a5b74cfe1356f", "43334000000000000000000"], ["0x51fa50e2d8c824fc7e1364e3a469ff2539d9e654", "300000000000000000000"], ["0x556f2d3324de5c6d3d71272d10b6e3fe7205a2c5", "13500000000000000000000"], ["0x578cf110bd2c2dcd9f1f0909a0f5a4e23c9ea4e2", "50000000000000000000000"], ["0x5c4826a7690fd26fc28ae17f425534e7e4ce9ff4", "3000000000000000000000"], ["0x5d7b5defe96b48d7ede9e6464071d25b6f3e0ea2", "2000000000000000000000"], ["0x5d8f53f5ad38ee23e92232c2a4cb98fa91b4666d", "1000000000000000000000000"], ["0x62e0b62a0c869c13c8937b17e329f69d887dce5e", "12000000000000000000000"], ["0x65465d752e9c5612bc51e8f4c729ab0ae8a10f8b", "67000000000000000000000"], ["0x65b3ee928a45bcd3f2448a94d483ca2fbe11f176", "1000000000000000000000000"], ["0x6e01e3dc500abb7a3bb542e372612bd44be6ebcb", "3000000000000000000"], ["0x6f7150a4c948f2a5f3d005df9d4d1c95f196647a", "12877000000000000000000"], ["0x74be96a5a981335f70674be02b428fdb6dcc24e3", "10000000000000000000000"], ["0x769c28802bccb55d9f9f6e42e63e857296194ef6", "10000000000000000000000"], ["0x77ddd91079dbccc21c759621aa48be5f20b066b1", "780000000000000000000"], ["0x78e56bad16143e498000a9b96b120cb95bab6d16", "2000000000000000000000000"], ["0x7901859fc06a7c3806b0316c268bb93d82bda180", "1550000000000000000000"], ["0x7b4b65e6a4cbbc1c7fa60fd166a112584e451924", "27000000000000000000000"], ["0x809e32fb4edfeef771a2262935b33a3bd3beb53b", "135000000000000000000000"], ["0x81036acab4da3d559fe11299d48d43b3d31551a7", "420000000000000000000000"], ["0x85921ec3c078b5b10222d4f078e4977e47e65610", "242333000000000000000000"], ["0x8a399ee7775b53ffdca9af557d8ee11a9e105135", "55128163881342600000000"], ["0x8f77cfb31c7a5ad1fd72314d24bf285d1c0d8695", "264200000000000000000000"], ["0x97d932d10ad6053f71ad9ab8fa655c45ef0efe32", "9997540163030710000000000"], ["0x98aa5af6c15d91e3cdc0abd0747e8728c43baa32", "12500000000000000000000"], ["0x99383f9e6b64d41f8a349eed6af75a99ba1025da", "25000000000000000000000"], ["0x9992751b0cb398767eb06947e50e454493aa4b9d", "2000000000000000000000000"], ["0x9b61196916286e40595fad5a348f794266c457c1", "1000000000000000000"], ["0x9e740e3f5c789e427fccc54fe762b6599722ea68", "20000000000000000000000"], ["0x9efaebc4b83c574cdc40479dc24d0dcca1b4a216", "9750000000000000000000000"], ["0xa001db106c82157e782c465b05c7916b05505a24", "10000000000000000000000"], ["0xa34147ce6dfcf516b8458caf254819b604695632", "200000000000000000000000"], ["0xa45a57fe07e2659b5216b57b0f237e4bb86b8f79", "67000000000000000000000"], ["0xa80c690042dbe5dac158dc3d5a4c04524d238a43", "2222222240000000000000000"], ["0xae5867d0806b0a8f3e52a7068dd3f78dbd087273", "10000000000000000000000"], ["0xb1a6d110b0eefdbd2a0effdecbcb59f2515a5bd3", "135000000000000000000000"], ["0xb3fce2b93375ce5725c8b60d3618e9bd23b20de7", "600000000000000000000"], ["0xb7df00a40b33d20f0d8df65420559279133c273e", "50567000000000000000000"], ["0xbafee4e0c76c113503247f3eb2efec495d8e1760", "28572000000000000000000"], ["0xbe3ed928ed472ea3f43aee60e14b7ed0737cfc70", "1971427000000000000000000"], ["0xc0b1d2abeb68da7c416f5bab8dc58ebdc2fb7100", "28573000000000000000000"], ["0xc1750e4ca31e156f7093ff29cd1fc79ba077ddee", "11670000000000000000000"], ["0xc3a03ba0d7631d44be314766bf39aed55482075c", "10000000000000000000000000"], ["0xc4bdb3f8f6f6e428c16d6b3e288a289df85ce3e0", "5000010000000000000000000"], ["0xc57fdeb5e46e94f8e1914e00b79d9b5805db22bc", "1333335000000000000000000"], ["0xd148add3820e1cc83ebcbfc6d1e5d6553f0a8b48", "2429534000000000000000000"], ["0xd1b54e3f038c533bcf0b79cce10ef29f1c92c28e", "333334000000000000000000"], ["0xd2574eca82f7335e768656d2194659c1898fea6c", "1000000000000000000000000"], ["0xd2a0c07cd2481126fc30b43698105555a1c1a759", "25500000000000000000000"], ["0xd3669f1a22f8bd2b9ef9955d76626cc967ca1fae", "1000000000000000000"], ["0xd39050889117ffb23cff41f9c720a0ed45b40df6", "200001000000000000000000"], ["0xd81d22b7cb2adbf7daacdbe6c0b821daca0e965b", "8760000000000000000000"], ["0xd9346f413b899fa4a42e7cf115c43ec14dda2620", "10000010000000000000000000"], ["0xda56f94f1000905384e9509ca4c7f620b6cfec7a", "500010000000000000000000"], ["0xdbb1970b1e354eab5e13b26b19b8b445706732b3", "1000000000000000000"], ["0xe17dd745aeb6a22ceaa3b5919fd8ebc74ee60a98", "80221830000000000000000"], ["0xe2231dca7f43c9a3d3dfab02b9bc8099417ccd25", "20000000000000000000000"], ["0xe421b5c6680bb06f25e0f8dd138c96913d2c1599", "1000000000000000000"], ["0xe709743e2c5d28dec76373529879fe45ff6b226c", "25000000000000000000000"], ["0xe71f0b7bec116feeb6cc65a225822b08fd414367", "12500000000000000000000"], ["0xe8d77bb2df30111567abc287b85a23c97f5b61b0", "25500000000000000000000"], ["0xf07e2459491bfc37fa1d4a17cdbd86581466ad6a", "9250000000000000000000"], ["0xf7eda499864e9206e4b3d84ab3404e81b7ab68ea", "32359788087948500000000"]];
    
    var sellTax=[100,10,10];
    var transfer = [0,10,0];
    var progressive=[5,100,3600];
    var ownersList = [[accountNine,60], [accountTen,40]];
    
    const duration1Day = 86_400;       // 1 year
    const durationLockupUSAPerson = 31_536_000;       // 1 year
    const durationLockupNoneUSAPerson = 3_456_000;    // 40 days
    
    const ts2050y = 2525644800;
    
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
    async function statsView(objThis) {
        
        // console.log('================================');
        //  console.log('price0CumulativeLast           =', (await objThis.uniswapV2PairInstance.price0CumulativeLast()).toString());
	    // console.log('price1CumulativeLast           =', (await objThis.uniswapV2PairInstance.price1CumulativeLast()).toString());
	    let tmp = await objThis.uniswapV2PairInstance.getReserves();
	    let price;
	    console.log('getReserves[reserve0]          =', (tmp.reserve0).toString());
	    console.log('getReserves[reserve1]          =', (tmp.reserve1).toString());
        //console.log('tmp.reserve1/tmp.reserve0      =', (tmp.reserve1/tmp.reserve0).toString());
        if (objThis.WETHAddr == objThis.token0) {
            price = tmp.reserve0/tmp.reserve1;
        } else {
            price = tmp.reserve1/tmp.reserve0;    
        }
	    console.log('Price                          =', (price).toString());
	    
	   // console.log('getReserves[blockTimestampLast]=', (tmp.blockTimestampLast).toString());
/*
	    console.log('=WETH======================');
	    console.log('accountOne(WETH)  =', (await objThis.WETHInstance.balanceOf(accountOne)).toString());
	    console.log('Pair(WETH)        =', (await objThis.WETHInstance.balanceOf(objThis.uniswapV2PairInstance.address)).toString());
	    console.log('ITRContract(WETH) =', (await objThis.WETHInstance.balanceOf(objThis.TradedTokenContractMockInstance.address)).toString());
	    console.log('=ETH======================');
	    console.log('accountOne(ETH)   =', (await web3.eth.getBalance(accountOne)).toString());	    
	    console.log('Pair(ETH)         =', (await web3.eth.getBalance(objThis.uniswapV2PairInstance.address)).toString());
	    console.log('ITRContract(ETH)  =', (await web3.eth.getBalance(objThis.TradedTokenContractMockInstance.address)).toString());	    
	    console.log('=ITR======================');
	    console.log('accountOne(ITR)   =', (await objThis.TradedTokenContractMockInstance.balanceOf(accountOne)).toString());
	    console.log('Pair(ITR)         =', (await objThis.TradedTokenContractMockInstance.balanceOf(objThis.uniswapV2PairInstance.address)).toString());
	    console.log('ITRContract(ITR)  =', (await objThis.TradedTokenContractMockInstance.balanceOf(objThis.TradedTokenContractMockInstance.address)).toString());
	    console.log('=======================');
	    console.log('accountOne(CAKE)  =', (await objThis.uniswapV2PairInstance.balanceOf(accountOne)).toString());
	    console.log('Pair(CAKE)        =', (await objThis.uniswapV2PairInstance.balanceOf(objThis.uniswapV2PairInstance.address)).toString());
	    console.log('ITRContract(CAKE) =', (await objThis.uniswapV2PairInstance.balanceOf(objThis.TradedTokenContractMockInstance.address)).toString());
*/
	   // console.log('================================');
    }
    
    
    var TransferRulesInstance;
    /* */
    beforeEach(async() =>{
        erc1820= await singletons.ERC1820Registry(accountNine);

        //TransferRulesInstance = await deployProxy(TransferRulesMock);
        this.TransferRulesInstance = await TransferRulesMock.new({from: accountTen});
        await this.TransferRulesInstance.init({from: accountTen});
        

        this.TradedTokenContractMockInstance = await TradedTokenContractMock.new({from: accountTen});
	    this.TradedTokenContractMockInstance.initialize(name, symbol, defaultOperators, predefinedBalances, sellTax, transfer, progressive, ownersList, {from: accountTen});
	    this.TradedTokenContractMockInstance.donateETH({from: accountTen, value: '0x'+BigNumber(15e18).toString(16)});
	    this.TradedTokenContractMockInstance.setInitialPrice(100000, {from: accountTen});
	    
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
        trTmp = await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(zeroAddr, {from: accountTen});
        helperCostEth.transactionPush(trTmp, '_updateRestrictionsAndRules');
        
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, {from: accountTen});
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, {from: accountTen}),
            'external contract already set'
        );
        
    });
 
    it('owner can manage role `managers`', async () => {
        let objThis = this;
        
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.managersAdd([accountOne], {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.managersRemove([accountOne], {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        
        let managersGroupName = await objThis.TransferRulesInstance.getManagersGroupName({from: accountTen});
        
        trTmp = await objThis.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::managersAdd');
        tmpBool = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, {from: accountTen});
        assert.equal(tmpBool, true, 'could not add manager');
        
        trTmp = await objThis.TransferRulesInstance.managersRemove([accountOne], {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::managersRemove');
        tmpBool = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, {from: accountTen});
        assert.equal(tmpBool, false, 'could not remove manager');
        
        
        // remove from list if none exist before
        tmpBool = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountTwo, {from: accountTen});
        await objThis.TransferRulesInstance.managersRemove([accountTwo], {from: accountTen});
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountTwo, {from: accountTen});
        assert.equal(tmpBool, tmpBool2, 'removing manager from list if none exist before went wrong');
        
        // add to list if already exist
        await objThis.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        tmpBool = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, {from: accountTen});
        await objThis.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelistedMock(managersGroupName, accountOne, {from: accountTen});
        assert.equal(tmpBool, tmpBool2, 'adding manager list if already exist went wrong');
        
    });
 
    it('managers can add/remove person to whitelist', async () => {
        let objThis = this;
        
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne}), 
            "Sender is not in whitelist"
        );
        
        //owner can't add into whitelist if he will not add himself to managers list
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountTen}), 
            "Sender is not in whitelist"
        );
        
        await objThis.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        
        tmpBool = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        trTmp = await objThis.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::whitelistAdd');
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        assert.equal(((tmpBool != tmpBool2) && tmpBool2 == true), true, 'could add person to whitelist');
        
        tmpBool = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        trTmp = await objThis.TransferRulesInstance.whitelistRemove([accountTwo], {from: accountOne});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::whitelistRemove');
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        assert.equal(((tmpBool != tmpBool2) && tmpBool2 == false), true, 'could add person to whitelist');
        //---------
        // remove from list if none exist before
        tmpBool = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        await objThis.TransferRulesInstance.whitelistRemove([accountTwo], {from: accountOne});
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        assert.equal(tmpBool, tmpBool2, 'removing person from list if none exist before, went wrong');
        
        // add to list if already exist
        await objThis.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne});
        tmpBool = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        await objThis.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne});
        tmpBool2 = await objThis.TransferRulesInstance.isWhitelisted(accountTwo, {from: accountTen});
        assert.equal(tmpBool, tmpBool2, 'adding person to whitelist if already exist, went wrong');
        
    });
  
    it('should no restrictions after deploy', async () => {
        let objThis = this;

        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(zeroAddr, {from: accountTen});
        
        // create managers
        await objThis.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        await objThis.TransferRulesInstance.managersAdd([accountTwo], {from: accountTen});
        
        // create whitelist persons
        await objThis.TransferRulesInstance.whitelistAdd([accountThree], {from: accountOne});
        await objThis.TransferRulesInstance.whitelistAdd([accountFourth], {from: accountTwo});
        
        
        let arr = [accountOne,accountTwo,accountThree,accountFourth];
        // mint to all accounts 1000 ITR
        // and to itself(owner) too
        for(var i=0; i<arr.length; i++) {
            await objThis.TradedTokenContractMockInstance.mint(arr[i], BigNumber(1000*1e18), {from: accountTen});
            // check Balance
            tmpBalance = await objThis.TradedTokenContractMockInstance.balanceOf(arr[i]);
            assert.equal(
                (BigNumber(1000*1e18)).toString(),
                (BigNumber(tmpBalance)).toString(),
                "wrong balance for account "+arr[i]
            )
        }
        
        // try to send 10ITR and send back 40ITR for each account
        // make a not that taxed does not applied for regular transfer (not unswappair, not address(this))
        tmpCounter = 0;
        for(var i=0; i<arr.length; i++) {
            for(var j=0; j<arr.length; j++) {
                // except from itself to itself
                if (arr[i] != arr[j]) {
                    tmpCounter++;

                    await sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, arr[i], arr[j], BigNumber(10*1e18), "Iteration#"+tmpCounter+" (sendTo)");
                    await sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, arr[j], arr[i], BigNumber(40*1e18), "Iteration#"+tmpCounter+" (sendBack)");
                }
            }
        }

    });

    it('automaticLockup should call only by owner', async () => {
        let objThis = this;
        
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.automaticLockupAdd(accountOne, 5, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.automaticLockupRemove(accountOne, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        
        trTmp = await objThis.TransferRulesInstance.automaticLockupAdd(accountOne, 5, {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::automaticLockupAdd');
        trTmp = await objThis.TransferRulesInstance.automaticLockupRemove(accountOne, {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::automaticLockupRemove');
    });
    
    it('minimums should call only by owner', async () => {
        let objThis = this;
        
        let latestBlockInfo = await web3.eth.getBlock("latest");
        
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500*1e18), latestBlockInfo.timestamp + duration1Day, true, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.minimumsClear(accountOne, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        
        trTmp = await objThis.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500*1e18), latestBlockInfo.timestamp + duration1Day, true, {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::minimumsAdd');
        trTmp = await objThis.TransferRulesInstance.minimumsClear(accountOne, {from: accountTen});
        helperCostEth.transactionPush(trTmp, 'TransferRulesInstance::minimumsClear');
    });

    it('testing automaticLockup', async () => {
        let objThis = this;
        
        
        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, {from: accountTen});
        
        //mint accountOne 1000ITR
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(1500*1e18), {from: accountTen});
        
        // be sure that accountOne can send to someone without lockup limit
        await sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountOne, accountTwo, BigNumber(500*1e18), "Iteration#1");
        await sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountTwo, accountThree, BigNumber(500*1e18), "Iteration#2");
        
        // setup automatic lockup for accountOne for 1 day
        await objThis.TransferRulesInstance.automaticLockupAdd(accountOne, 1, {from: accountTen});
        // check lockup exist
        tmp = await objThis.TransferRulesInstance.getLockup(accountOne, {from: accountTen});
        assert.equal(tmp[0].toString(),(BigNumber(1).times(BigNumber(86400))).toString(), 'duration lockup was set wrong');
        assert.equal(tmp[1],true, 'duration lockup was set wrong');
        
       
        // send to accountFourth
        await sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(500*1e18), "Iteration#3");
        // try to send 500 ITR tokens from accountFourth to accountFive
        // expecting that tokens will be lock for accountFourth for 1 day

        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountFive, BigNumber(500*1e18), {from: accountFourth}), 
            "Transfer not authorized"
        );
        
        tmpBool = await objThis.TransferRulesInstance.authorize(accountFourth, accountFive, BigNumber(500*1e18), {from: accountFourth});
        assert.equal(tmpBool, false, 'emsg `Transfer not authorized` does not emit');
        
      
        // pass 1 days
        await helper.advanceTimeAndBlock(1*duration1Day);

        
        // and try again
        await sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountFourth, accountFive, BigNumber(500*1e18), "Iteration#4");
        
        
        ///// 
        // remove automaticLockup from accountOne
        await objThis.TransferRulesInstance.automaticLockupRemove(accountOne, {from: accountTen});
        // send to accountFourth another 500 ITR
        await sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(500*1e18), "Iteration#5");
        // expecting that the tokens doesnot locked up and transfered w/out reverts
        await objThis.TradedTokenContractMockInstance.transfer(accountFive, BigNumber(500*1e18), {from: accountFourth});
        
    });
 
    it('whitelistReduce should reduce locked time for whitelist persons', async () => {
        let objThis = this;
        
        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, {from: accountTen});
        
        // owner adding manager 
        await objThis.TransferRulesInstance.managersAdd([accountOne], {from: accountTen});
        // manager adding person into whitelist
        await objThis.TransferRulesInstance.whitelistAdd([accountTwo], {from: accountOne});
        
        // setup 4 days locked up for manager
        await objThis.TransferRulesInstance.automaticLockupAdd(accountOne, 4, {from: accountTen});
        // mint 1500 ITR to manager
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(1500*1e18), {from: accountTen});
        // setup whitelistReduce value into 1 day
        await objThis.TransferRulesInstance.whitelistReduce(1, {from: accountTen});
        
        // transfer 500ITR to whitelist person
        await objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne})
        // transfer 500ITR to none-whitelist person
        await objThis.TradedTokenContractMockInstance.transfer(accountThree, BigNumber(500*1e18), {from: accountOne})

        // revert all: none-whitelist and whitelist person
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountTwo}), 
            "Transfer not authorized"
        );
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountThree}), 
            "Transfer not authorized"
        );
        
        // pass 1 days
        await helper.advanceTimeAndBlock(1*duration1Day);
        
        // revert for none-whitelist person only
        await objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountTwo});
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountThree}), 
            "Transfer not authorized"
        );
        
        // pass 3 days
        await helper.advanceTimeAndBlock(3*duration1Day);
        // in total passed 4 days  so tokens will be available for none-whitelist person
        await objThis.TradedTokenContractMockInstance.transfer(accountFourth, BigNumber(500*1e18), {from: accountThree});
        
        t = await objThis.TransferRulesInstance.minimumsView(accountFourth, {from: accountFourth});
        assert.equal(t[0].toString(), BigNumber(0).toString(), ' minimums are not equal zero for accountFourth');
        assert.equal(t[1].toString(), BigNumber(0).toString(), ' minimums(gradual) are not equal zero for accountFourth');
        
        t = await objThis.TradedTokenContractMockInstance.balanceOf(accountFourth, {from: accountFourth});
        assert.equal(BigNumber(t).toString(), BigNumber(1000*1e18).toString(), 'Balance for accountFourth are wrong');
            
    });
  
    it('testing minimums', async () => {

        let objThis = this;
        let latestBlockInfo;
        
        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(this.TransferRulesInstance.address, {from: accountTen});
        
        //------- #1
        //mint accountOne 500ITR
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(500*1e18), {from: accountTen});
        
        latestBlockInfo = await web3.eth.getBlock("latest");
        
        await objThis.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500*1e18), latestBlockInfo.timestamp + duration1Day, true, {from: accountTen});
        
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne}), 
            "Transfer not authorized"
        );
        
        // pass 1 days
        await helper.advanceTimeAndBlock(1*duration1Day);
        // try again
        await objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne});
    
        //------- #2
        //mint accountOne 500ITR
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(500*1e18), {from: accountTen});
        
        latestBlockInfo = await web3.eth.getBlock("latest");
        
        await objThis.TransferRulesInstance.minimumsAdd(accountOne, BigNumber(500*1e18), latestBlockInfo.timestamp + duration1Day, true, {from: accountTen});
        
        await truffleAssert.reverts(
            objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne}), 
            "Transfer not authorized"
        );
        // remove minimums
        await objThis.TransferRulesInstance.minimumsClear(accountOne, {from: accountTen});
        
        // try again (so without passing 1 day)
        await objThis.TradedTokenContractMockInstance.transfer(accountTwo, BigNumber(500*1e18), {from: accountOne});
        
    });

    it('test dailyRate', async () => {
       let objThis = this;
        
        // _updateRestrictionsAndRules     
        await objThis.TradedTokenContractMockInstance._updateRestrictionsAndRules(objThis.TransferRulesInstance.address, {from: accountTen});
        
        //------- #1
        //mint accountOne 500ITR
        await objThis.TradedTokenContractMockInstance.mint(accountOne, BigNumber(500*1e18), {from: accountTen});
        
        
        await truffleAssert.reverts(
            objThis.TransferRulesInstance.dailyRate(BigNumber(500*1e18), 1, {from: accountFive}), 
            "Ownable: caller is not the owner"
        );
        
        await objThis.TransferRulesInstance.dailyRate(BigNumber(100*1e18), 1, {from: accountTen});
        
        await sendAndCheckCorrectBalance(objThis.TradedTokenContractMockInstance, accountOne, accountFourth, BigNumber(200*1e18), "Iteration#1");
        
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

    it('simulation', async () => {
        
        var objThis = this;

        await statsView(objThis);
	    
        let accountsArr = [accountOne, accountTwo, accountThree, accountFourth, accountFive, accountSix, accountSeven, accountEight];
        //let accountsArr = [accountOne, accountTwo];
  
        let iterationCounts = 100,
            i = 0,
            accountRandomIndex,
            typeTodo,
            totalBalance,
            amount2Send
            ;
        
        while (i < iterationCounts) {
            i++;
            
            try {
                accountRandomIndex = Math.floor(Math.random() * accountsArr.length);
                typeTodo = Math.floor(Math.random() * 2);
                
                if (typeTodo == 0) {
                    // swapExactETHForTokens
                    //totalBalance = await web3.eth.getBalance(accountOne);
                    amount2Send = Math.floor(Math.random() * 10 ** 19);

                    await this.uniswapV2RouterInstance.swapExactETHForTokens(
            	        '0x'+BigNumber(amount2Send).toString(16),
            	        objThis.pathETHToken,
            	        accountsArr[accountRandomIndex], 
            	        ts2050y, {from: accountsArr[accountRandomIndex], value:'0x'+BigNumber(amount2Send).toString(16)}
                    );

                } else {
                    // swap back
                    totalBalance = await this.TradedTokenContractMockInstance.balanceOf(accountsArr[accountRandomIndex]);
                    if (totalBalance >0) {
                        amount2Send = Math.floor(Math.random() *  10 ** (totalBalance.toString().length-1));

        	            await this.TradedTokenContractMockInstance.approve(this.uniswapV2RouterInstance.address, '0x'+BigNumber(amount2Send).toString(16), {from: accountsArr[accountRandomIndex]});
        	            
                	    await this.uniswapV2RouterInstance.swapExactTokensForETH(
                            '0x'+BigNumber(amount2Send).toString(16),
                            0, // accept any amount of ETH 
                            objThis.pathTokenETH,
                            accountsArr[accountRandomIndex],
                            ts2050y, {from: accountsArr[accountRandomIndex]}
                        );
                    } else {
                        //console.log("totalBalance==0");    
                        continue;
                    }

                }
                await statsView(objThis);     
            }
            catch (e) {
               // console.log(e);
               console.log('catch error');
            }
        }
        await statsView(objThis);     
  
  

    }); 

/* 
    //if need to view transaction cost consuming while tests
    it('summary transactions cost', async () => {
        console.table(await helperCostEth.getTransactionsCostEth(90, false));
    });

  */
});