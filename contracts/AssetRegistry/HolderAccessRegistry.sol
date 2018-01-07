pragma solidity ^0.4.18;

import './Storage.sol';

/**
 * Holder-centric getter functions
 */
contract HolderAccessRegistry is AssetRegistryStorage {

  function assetsCount(address _holder) public constant returns (uint256) {
    return _assetsOf[_holder].length;
  }

  function assetByIndex(address _holder, uint256 _index) public constant returns (uint256) {
    return _assetsOf[_holder][index];
  }

  function allAssetsOf(address _holder) public constant returns (uint256[]) {
    uint size = _assetsOf[_holder].length;
    uint[] memory result = new uint[](size);
    for (uint i = 0; i < size; i++) {
      result[i] = _assetsOf[_holder][i];
    }
    return result;
  }

  function allAssetsDataOf(address _holder) public constant returns (string[]) {
    uint size = _assetsOf[_holder].length;
    uint[] memory result = new uint[](size);
    for (uint i = 0; i < size; i++) {
      result[i] = _assetsOf[_holder][i];
    }
    return result;
  }
}
