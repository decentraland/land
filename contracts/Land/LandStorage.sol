pragma solidity ^0.4.18;

import '../AssetRegistry/Storage.sol';
import '../Upgradable/OwnableStorage.sol';

contract LANDStorage is AssetRegistryStorage, OwnableStorage {

  mapping (address => uint) latestPing;

}
