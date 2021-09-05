// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
/**
 * Realization a restriction limits for user transfer
 * 
 */
abstract contract Minimums is Initializable, ContextUpgradeable {
    
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
    
    mapping (address => UserStruct) users;
    uint256 internal dayInSeconds;
    
    function __Minimums_init(
    ) 
        internal
        initializer 
    {
        //__Ownable_init();
        
        dayInSeconds = 86400;
        
    }
    
    /**
    * @dev adding minimum holding at sender during period from now to timestamp.
    *
    * @param addr address which should be restricted
    * @param amount amount.
    * @param timestamp period until minimum applied
    * @param gradual true if the limitation can gradually decrease
    */
    function _minimumsAdd(
        address addr,
        uint256 amount, 
        uint256 timestamp,
        bool gradual
    ) 
        internal
//        onlyOwner()
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
     * @param from will add automatic lockup for destination address sent address from
     * @param daysAmount duration in days
     */
    function automaticLockupAdd(
        address from,
        uint256 daysAmount
    )
        internal
//        onlyOwner()
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
        internal
//        onlyOwner()
    {
        users[from].lockup.exists = false;
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

    
    
}