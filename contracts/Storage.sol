pragma solidity ^0.4.18;

import './Upgradable/UpgradableStorage.sol';
import './AssetRegistry/AssetRegistryStorage.sol';
import './Land/LandStorage.sol';

contract Storage is UpgradableStorage, AssetRegistryStorage, LandStorage {
}
