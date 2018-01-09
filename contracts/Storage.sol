pragma solidity ^0.4.18;

import './Upgradable/ProxyStorage.sol';

import './Upgradable/OwnableStorage.sol';

import './AssetRegistry/AssetRegistryStorage.sol';

import './Land/LANDStorage.sol';

contract Storage is ProxyStorage, OwnableStorage, AssetRegistryStorage, LANDStorage {
}