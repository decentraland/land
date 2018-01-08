pragma solidity ^0.4.18;

import '../AssetRegistry/Storage.sol';
import '../Upgradable/OwnableStorage.sol';

contract LANDStorage is OwnableStorage, AssetRegistryStorage {

  mapping (address => uint) latestPing;

  uint256 constant clearLow = 0xffffffffffffffffffffffffffffffff00000000000000000000000000000000;
  uint256 constant clearHigh = 0x00000000000000000000000000000000ffffffffffffffffffffffffffffffff;
  uint256 constant factor = 0x100000000000000000000000000000000;

}
