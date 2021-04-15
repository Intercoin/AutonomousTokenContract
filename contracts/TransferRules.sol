// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777Upgradeable.sol";
import "./interfaces/ITransferRules.sol";
import "./Whitelist.sol";
import "./IntercoinTrait.sol";

/*
 * @title TransferRules contract
 * @dev Contract that is checking if on-chain rules for token transfers are concluded.
 */
contract TransferRules is Initializable, OwnableUpgradeable, ITransferRules, Whitelist, IntercoinTrait {

	IERC777Upgradeable public _erc777;
	using SafeMathUpgradeable for uint256;
	using MathUpgradeable for uint256;
	using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
	
    struct Lockup {
        uint256 duration;
        //bool gradual; // does not used 
        bool exists;
    }
    
    struct Minimum {
        uint256 timestampStart;
        uint256 timestampEnd;
        uint256 amount;
        bool gradual;
    }
    struct UserStruct {
        EnumerableSetUpgradeable.UintSet minimumsIndexes;
        mapping(uint256 => Minimum) minimums;
        mapping(uint256 => uint256) dailyAmounts;
        Lockup lockup;
    }
    
    struct whitelistSettings {
        uint256 reducePeriod;
        //bool alsoGradual;// does not used 
        bool exists;
    }
    
    struct DailyRate {
        uint256 amount;   // minimum sum limit for last days
        uint256 daysAmount;
        bool exists;
    }
    
    struct Settings {
        whitelistSettings whitelist;
        DailyRate dailyRate;
    }
    
    //whitelistSettings settings;
    Settings settings;
    mapping (address => UserStruct) users;
    
    uint256 internal dayInSeconds;
    string  internal managersGroupName;
    
    modifier onlyERC777 {
        require(msg.sender == address(_erc777));
        _;
    }
    
    //---------------------------------------------------------------------------------
    // public  section
    //---------------------------------------------------------------------------------

    /**
     * init method
     */
    function init(
    ) 
        public 
        initializer 
    {
        __TransferRules_init();
    }
    
    /**
    * @dev clean ERC777. available only for owner
    */
    function cleanERC(
    ) 
        public
        onlyOwner()
    {
        _erc777 = IERC777Upgradeable(address(0));
    }
    
    
    /**
    * @dev viewing minimum holding in addr sener during period from now to timestamp.
    */
    function minimumsView(
        address addr
    ) 
        public
        view
        returns (uint256, uint256)
    {
        return getMinimum(addr);
    }
    
    /**
    * @dev adding minimum holding at sender during period from now to timestamp.
    *
    * @param addr address which should be restricted
    * @param amount amount.
    * @param timestamp period until minimum applied
    * @param gradual true if the limitation can gradually decrease
    */
    function minimumsAdd(
        address addr,
        uint256 amount, 
        uint256 timestamp,
        bool gradual
    ) 
        public
        onlyOwner()
        returns (bool)
    {
        require(timestamp > block.timestamp, 'timestamp is less then current block.timestamp');
        
        _minimumsClear(addr, false);
        require(users[addr].minimumsIndexes.add(timestamp), 'minimum already exist');
        
        //users[addr].data[timestamp] = minimum;
        users[addr].minimums[timestamp].timestampStart = block.timestamp;
        users[addr].minimums[timestamp].timestampEnd = timestamp;
        users[addr].minimums[timestamp].amount = amount;
        users[addr].minimums[timestamp].gradual = gradual;
        return true;
        
    }
    
    /**
     * @dev removes all minimums from this address
     * so all tokens are unlocked to send
     * @param addr address which should be clear restrict
     */
    function minimumsClear(
        address addr
    )
        public 
        onlyOwner()
        returns (bool)
    {
        return _minimumsClear(addr, true);
    }
        
 
    /**
    * @dev Checks if transfer passes transfer rules.
    *
    * @param from The address to transfer from.
    * @param to The address to send tokens to.
    * @param value The amount of tokens to send.
    */
    function authorize(
        address from, 
        address to, 
        uint256 value
    ) 
        public 
        view
        returns (bool) 
    {
        uint256 balanceOfFrom = IERC777Upgradeable(_erc777).balanceOf(from);
        return _authorize(from, to, value, balanceOfFrom);
    }
    
    /**
     * added managers. available only for owner
     * @param addresses array of manager's addreses
     */
    function managersAdd(
        address[] memory addresses
    )
        public 
        onlyOwner
        returns(bool)
    {
        return _whitelistAdd(managersGroupName, addresses);
    }     
    
    /**
     * removed managers. available only for owner
     * @param addresses array of manager's addreses
     */
    function managersRemove(
        address[] memory addresses
    )
        public 
        onlyOwner
        returns(bool)
    {
        return _whitelistRemove(managersGroupName, addresses);
    }    
    
    /**
     * Adding addresses list to whitelist
     * 
     * @dev Available from whitelist with group 'managers'(managersGroupName) only
     * 
     * @param addresses list of addresses which will be added to whitelist
     * @return success return true in any cases 
     */
    function whitelistAdd(
        address[] memory addresses
    )
        public 
        override 
        onlyWhitelist(managersGroupName) 
        returns (bool success) 
    {
        success = _whitelistAdd(commonGroupName, addresses);
    }
    
    /**
     * Removing addresses list from whitelist
     * 
     * @dev Available from whitelist with group 'managers'(managersGroupName) only
     * Requirements:
     *
     * - `addresses` cannot contains the zero address.
     * 
     * @param addresses list of addresses which will be removed from whitelist
     * @return success return true in any cases 
     */
    function whitelistRemove(
        address[] memory addresses
    ) 
        public 
        override 
        onlyWhitelist(managersGroupName) 
        returns (bool success) 
    {
        success = _whitelistRemove(commonGroupName, addresses);
    }
    
    /**
     * @param from will add automatic lockup for destination address sent address from
     * @param daysAmount duration in days
     */
    function automaticLockupAdd(
        address from,
        uint256 daysAmount
    )
        public 
        onlyOwner()
    {
        users[from].lockup.duration = daysAmount.mul(dayInSeconds);
        users[from].lockup.exists = true;
    }
    
    /**
     * @param from remove automaticLockup from address 
     */
    function automaticLockupRemove(
        address from
    )
        public 
        onlyOwner()
    {
        users[from].lockup.exists = false;
    }
    
    
    /**
     * @dev whenever anyone on whitelist receives tokens their lockup time reduce to daysAmount(if less)
     * @param daysAmount duration in days. if equal 0 then reduce mechanizm are removed
     */
    function whitelistReduce(
        uint256 daysAmount
    )
        public 
        onlyOwner()
    {
        if (daysAmount == 0) {
            settings.whitelist.exists = false;    
        } else {
            settings.whitelist.reducePeriod = daysAmount.mul(dayInSeconds);
            settings.whitelist.exists = true;    
        }
        
    }
    
    /**
     * setup limit sell amount of their tokens per daysAmount 
     * if days more than 1 then calculate sum amount for last days
     * @param amount token's amount
     * @param daysAmount days
     */
    function dailyRate(
        uint256 amount,
        uint256 daysAmount
    )
        public 
        onlyOwner()
    {
        if (daysAmount == 0) {
            settings.dailyRate.exists = false;    
        } else {
            settings.dailyRate.amount = amount;    
            settings.dailyRate.daysAmount = daysAmount;
            settings.dailyRate.exists = true;    
        }
          
    }

    //---------------------------------------------------------------------------------
    // internal  section
    //---------------------------------------------------------------------------------
    
    /**
     * init internal
     */
    function __TransferRules_init(
    ) 
        internal
        initializer 
    {
        __Ownable_init();
        __Whitelist_init();
        
        dayInSeconds = 86400;
        managersGroupName = 'managers';
    }
    
    /**
     * return true if 
     *  overall balance is enough 
     *  AND balance rest >= sum of gradual limits 
     *  AND rest >= none-gradual(except if destination is in whitelist) 
     * @param from The address to transfer from.
     * @param to The address to send tokens to.
     * @param value The amount of tokens to send.
     * @param balanceOfFrom balance at from before transfer
     */
    function _authorize(
        address from, 
        address to, 
        uint256 value,
        uint256 balanceOfFrom
    ) 
        internal
        view
        returns (bool) 
    {

        (uint256 sumRegularMinimum, uint256 sumGradualMinimum) = getMinimum(from);

        uint256 sumAmountsForPeriod = 0;
        uint256 currentBeginOfTheDay = beginOfTheCurrentDay();
        if (settings.dailyRate.exists == true && settings.dailyRate.daysAmount >= 1) {
            for(uint256 i = 0; i < settings.dailyRate.daysAmount; i++) {
                sumAmountsForPeriod = sumAmountsForPeriod.add(users[from].dailyAmounts[currentBeginOfTheDay.sub(i.mul(86400))]);
            }
        }
        

        if (balanceOfFrom >= value) {
            uint256 rest = balanceOfFrom.sub(value);
            
            if (
                (
                    sumGradualMinimum <= rest
                ) &&
                (
                    (settings.dailyRate.exists == true && sumAmountsForPeriod <= settings.dailyRate.amount ) 
                    ||
                    (settings.dailyRate.exists == false)
                ) &&
                (
                    (isWhitelisted(to)) 
                    ||
                    (sumRegularMinimum <= rest)
                ) 
            ) {
                  return true;
              }
        }
        
       
        return false;
    }
    
    

    /**
    * @dev get sum minimum and sum gradual minimums from address for period from now to timestamp.
    *
    * @param addr address.
    */
    function getMinimum(
        address addr
    ) 
        internal 
        view
        returns (uint256 retMinimum,uint256 retGradual) 
    {
        retMinimum = 0;
        retGradual = 0;
        
        uint256 amount = 0;
        uint256 mapIndex = 0;
        
        for (uint256 i=0; i<users[addr].minimumsIndexes.length(); i++) {
            mapIndex = users[addr].minimumsIndexes.at(i);
            
            if (block.timestamp <= users[addr].minimums[mapIndex].timestampEnd) {
                amount = users[addr].minimums[mapIndex].amount;
                
                if (users[addr].minimums[mapIndex].gradual == true) {
                    
                        amount = amount.div(
                                        users[addr].minimums[mapIndex].timestampEnd.sub(users[addr].minimums[mapIndex].timestampStart)
                                        ).
                                     mul(
                                        users[addr].minimums[mapIndex].timestampEnd.sub(block.timestamp)
                                        );
                                        
                    //retGradual = (amount > retGradual) ? amount : retGradual;
                    retGradual = retGradual.add(amount);
                } else {
                    retMinimum = retMinimum.add(amount);
                }
                
            }
        }
        
    }
    
    /**
    * @dev clear expired items from mapping. used while addingMinimum
    *
    * @param addr address.
    * @param deleteAnyway if true when delete items regardless expired or not
    */
    function _minimumsClear(
        address addr,
        bool deleteAnyway
    ) 
        internal 
        returns (bool) 
    {
        uint256 mapIndex = 0;
        uint256 len = users[addr].minimumsIndexes.length();
        if (len > 0) {
            for (uint256 i=len; i>0; i--) {
                mapIndex = users[addr].minimumsIndexes.at(i-1);
                if (
                    (deleteAnyway == true) ||
                    (block.timestamp > users[addr].minimums[mapIndex].timestampEnd)
                ) {
                    delete users[addr].minimums[mapIndex];
                    users[addr].minimumsIndexes.remove(mapIndex);
                }
                
            }
        }
        return true;
    }

    /**
     * added minimum if not exist by timestamp else append it
     * @param receiver destination address
     * @param timestampEnd "until time"
     * @param value amount
     * @param gradual if true then lockup are gradually
     */
    function _appendMinimum(
        address receiver,
        uint256 timestampEnd, 
        uint256 value, 
        bool gradual
    )
        internal
    {

        if (users[receiver].minimumsIndexes.add(timestampEnd) == true) {
            users[receiver].minimums[timestampEnd].timestampStart = block.timestamp;
            users[receiver].minimums[timestampEnd].amount = value;
            users[receiver].minimums[timestampEnd].timestampEnd = timestampEnd;
            users[receiver].minimums[timestampEnd].gradual = gradual; 
        } else {
            //'minimum already exist' 
            // just summ exist and new value
            users[receiver].minimums[timestampEnd].amount = users[receiver].minimums[timestampEnd].amount.add(value);
        }
    }
    
    /**
     * @dev reduce minimum by value  otherwise remove it 
     * @param addr destination address
     * @param timestampEnd "until time"
     * @param value amount
     */
    function _reduceMinimum(
        address addr,
        uint256 timestampEnd, 
        uint256 value
    )
        internal
    {
        
        if (users[addr].minimumsIndexes.contains(timestampEnd) == true) {
            if (value < users[addr].minimums[timestampEnd].amount) {
               users[addr].minimums[timestampEnd].amount = users[addr].minimums[timestampEnd].amount.sub(value);
            } else {
                delete users[addr].minimums[timestampEnd];
                users[addr].minimumsIndexes.remove(timestampEnd);
            }
        }
    }
    
    /**
     * @dev 
     *  A - issuers
     *  B - not on whitelist
     *  C - on whitelist
     *  There are rules:
     *  1. A sends to B: lockup for 1 year
     *  2. A sends to C: lock up for 40 days
     *  3. B sends to C: lock up for 40 days or remainder of B’s lockup, whichever is lower
     *  4. C sends to other C: transfer minimum with same timestamp to recipient and lockups must remove from sender
     * 
     * @param from sender address
     * @param to destination address
     * @param value amount
     * @param balanceFromBefore balances sender's address before executeTransfer
     */
    function _applyRuleLockup(
        address from, 
        address to, 
        uint256 value,
        uint256 balanceFromBefore
    ) 
        private
    {
        
        // check available balance for make transaction. in _authorize have already check whitelist(to) and available tokens 
        require(_authorize(from, to, value, balanceFromBefore), "Transfer not authorized");


        uint256 automaticLockupDuration;

        // get lockup time if was applied into fromAddress by automaticLockupAdd
        if (users[from].lockup.exists == true) {
            automaticLockupDuration = users[from].lockup.duration;
        }
        
        // calculate how much tokens we should transferMinimums without free tokens
        // here 
        //// value -- is how much tokens we would need to transfer
        //// minimumsNoneGradual -- how much tokens locks by none gradual minimums
        //// balanceFromBefore-minimum -- it's free tokens
        //// amount-(value without free tokens) -- how much tokens need to transferMinimums to destination address
        // for example 
        // balance - 100. locked = 50; need to transfer 70
        // here balanceFromBefore=100; 
        //      minimumsNoneGradual=50; 
        //      value=70;
        //      amount is should be 20;
        // and 20 tokens should be transfered with locked time(or reduced)
        
        (uint256 minimumsNoneGradual,uint256 gradualMinimums) = getMinimum(from);
        
        uint256 t = balanceFromBefore.sub(minimumsNoneGradual.max(gradualMinimums));
        uint256 amount = (value >= t) ? value.sub(t) : value;
        
        // A -> B automaticLockup minimums added
        // A -> C automaticLockup minimums but reduce to 40
        // B -> C transferLockups and reduce to 40
        // C -> C transferLockups

        if (users[from].lockup.exists == true) {
            // then sender is A
        
            // _appendMinimum(
            //     to,
            //     untilTimestamp,
            //     value, 
            //     false   //bool gradual
            // );
            minimumsTransfer(
                from, 
                to, 
                amount, 
                false, 
                (
                    (isWhitelisted(to)) 
                    ? 
                        (
                        settings.whitelist.exists
                        ?
                        automaticLockupDuration.min(settings.whitelist.reducePeriod) 
                        :
                        automaticLockupDuration
                        )
                    : 
                    automaticLockupDuration
                )
            );
            
            // C -> C transferLockups
        } else if (isWhitelisted(from) && isWhitelisted(to)) {
            
            
            
             //11111111111111111111
            // Balance 60
            // Lockup 50 for 11 months remaining
            // Gradual minimum 48
            // User can send 12 tokens to C or 10 tokens to B
            //22222222222222222222
            // Balance 60
            // Lockup 30 for 11 months remaining
            // Gradual minimum 48
            // User can send 12 tokens to C or 12 tokens to B
        
        
        
            minimumsTransfer(
                from, 
                to, 
                amount, 
                false, 
                0
            );
        } else{
            // else sender is B 
            
            if (isWhitelisted(to)) {
                minimumsTransfer(
                    from, 
                    to, 
                    amount, 
                    true, 
                    settings.whitelist.reducePeriod
                );
            }
            // else available only free tokens to transfer and this was checked in autorize method before
        }

    }
  
    /**
     * 
     * @param from sender address
     * @param to destination address
     * @param value amount
     * @param reduceTimeDiff if true then all timestamp which more then minTimeDiff will reduce to minTimeDiff
     * @param minTimeDiff minimum lockup period time or if reduceTimeDiff==false it is time to left tokens
     */
    function minimumsTransfer(
        address from, 
        address to, 
        uint256 value, 
        bool reduceTimeDiff,
        uint256 minTimeDiff
    )
        internal
    {
        

        uint256 len = users[from].minimumsIndexes.length();
        uint256[] memory _dataList;
        uint256 recieverTimeLeft;
        
        if (len > 0) {
            _dataList = new uint256[](len);
            for (uint256 i=0; i<len; i++) {
                _dataList[i] = users[from].minimumsIndexes.at(i);
            }
            _dataList = sortAsc(_dataList);
            
            uint256 iValue;
            
            
            for (uint256 i=0; i<len; i++) {
                
                if (
                    (users[from].minimums[_dataList[i]].gradual == false) &&
                    (block.timestamp <= users[from].minimums[_dataList[i]].timestampEnd)
                ) {

                    if (value >= users[from].minimums[_dataList[i]].amount) {
                        //iValue = users[from].data[_dataList[i]].minimum;
                        iValue = users[from].minimums[_dataList[i]].amount;
                        value = value.sub(iValue);
                    } else {
                        iValue = value;
                        value = 0;
                    }

                    recieverTimeLeft = users[from].minimums[_dataList[i]].timestampEnd.sub(block.timestamp);
                    // put to reciver
                    _appendMinimum(
                        to,
                        block.timestamp.add((reduceTimeDiff ? minTimeDiff.min(recieverTimeLeft) : recieverTimeLeft)),
                        iValue,
                        false //users[from].data[_dataList[i]].gradual
                    );
                    
                    // remove from sender
                    _reduceMinimum(
                        from,
                        users[from].minimums[_dataList[i]].timestampEnd,
                        iValue
                    );
                      
                    if (value == 0) {
                        break;
                    }
                
                }
            } // end for
            
   
        }
        
        if (value != 0) {
            
            
            _appendMinimum(
                to,
                block.timestamp.add(minTimeDiff),
                value,
                false
            );
        }
     
        
    }
    
   
    //---------------------------------------------------------------------------------
    // external section
    //---------------------------------------------------------------------------------
    
    /**
    * @dev Set for what contract this rules are.
    *
    * @param erc777 - Address of ERC777 contract.
    */
    function setERC(
        address erc777
    ) 
        override 
        external 
        returns (bool) 
    {
        require(address(_erc777) == address(0), "external contract already set");
        _erc777 = IERC777Upgradeable(erc777);
        return true;
    }

    /**
    * @dev Do transfer and checks where funds should go. If both from and to are
    * on the whitelist funds should be transferred but if one of them are on the
    * grey list token-issuer/owner need to approve transfer.
    *
    * @param from The address to transfer from.
    * @param to The address to send tokens to.
    * @param value The amount of tokens to send.
    */
    function applyRuleLockup(
        address from, 
        address to, 
        uint256 value
    ) 
        override 
        external 
        onlyERC777 
        returns (bool) 
    {
        uint256 balanceFromBefore = IERC777Upgradeable(_erc777).balanceOf(from);
        
        _applyRuleLockup(from, to, value, balanceFromBefore);
        // store to daily amounts
        users[from].dailyAmounts[beginOfTheCurrentDay()] = users[from].dailyAmounts[beginOfTheCurrentDay()].add(value);
        return true;
    }
    
    //---------------------------------------------------------------------------------
    // private  section
    //---------------------------------------------------------------------------------
    
    
    // useful method to sort native memory array 
    function sortAsc(uint256[] memory data) private returns(uint[] memory) {
       quickSortAsc(data, int(0), int(data.length - 1));
       return data;
    }
    
    function quickSortAsc(uint[] memory arr, int left, int right) private {
        int i = left;
        int j = right;
        if(i==j) return;
        uint pivot = arr[uint(left + (right - left) / 2)];
        while (i <= j) {
            while (arr[uint(i)] < pivot) i++;
            while (pivot < arr[uint(j)]) j--;
            if (i <= j) {
                (arr[uint(i)], arr[uint(j)]) = (arr[uint(j)], arr[uint(i)]);
                i++;
                j--;
            }
        }
        if (left < j)
            quickSortAsc(arr, left, j);
        if (i < right)
            quickSortAsc(arr, i, right);
    }

    function beginOfTheCurrentDay() private view returns(uint256) {
        return (block.timestamp.div(86400).mul(86400));
    }
	
}
