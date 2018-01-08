pragma solidity ^0.4.18;

import '../AssetRegistry/TransferableAssetRegistry.sol';
import './ILANDRegistry.sol';
import './LANDStorage.sol';

contract TransferableLAND is TransferableAssetRegistry, LANDStorage, ILANDRegistry {
  function transferLand(int x, int y, address to) public {
    return send(to, buildTokenId(x, y));
  }

  function transferManyLand(int[] x, int[] y, address to) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      return send(to, buildTokenId(x[i], y[i]));
    }
  }
}
