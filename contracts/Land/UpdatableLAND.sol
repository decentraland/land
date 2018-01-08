pragma solidity ^0.4.18;

import '../AssetRegistry/UpdatableAssetRegistry.sol';
import './LANDStorage.sol';
import './ILANDRegistry.sol';

contract UpdatableLAND is UpdatableAssetRegistry, LANDStorage, ILANDRegistry {
  function updateLandData(int x, int y, string _metadata) public {
    return update(buildTokenId(x, y), _metadata);
  }
  function updateManyLandData(int[] x, int[] y, string data) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      update(buildTokenId(x[i], y[i]), data);
    }
  }
}
