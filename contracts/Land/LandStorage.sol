pragma solidity ^0.4.18;

import '../AssetRegistry/Storage.sol';
import '../Upgradable/OwnableStorage.sol';

contract LANDStorage is OwnableStorage, AssetRegistryStorage {

  mapping (address => uint) latestPing;

}
