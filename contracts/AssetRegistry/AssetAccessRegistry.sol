pragma solidity ^0.4.18;

import './Storage.sol';

/**
 * Asset-centric getter functions
 */
contract AssetAccessRegistry is AssetRegistryStorage {
  function exists(uint256 _assetId) public constant returns (bool) {
    return _holderOf[_assetId] != 0;
  }
  function holderOf(uint256 _assetId) public constant returns (address) {
    return _holderOf[_assetId];
  }
  function assetData(uint256 _assetId) public constant returns (string) {
    return _assetData[_assetId];
  }
}
