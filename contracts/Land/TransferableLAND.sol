pragma solidity ^0.4.18;

import './ILANDRegistry.sol';
import './LANDStorage.sol';

contract TransferableLAND is ILANDRegistry, LANDStorage {
  function transferLand(uint x, uint y, address to) public {
    return send(to, buildTokenId(x, y));
  }

  function transferManyLand(uint x[], uint y[], address to) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      return send(to, buildTokenId(x[i], y[i]));
    }
  }
}
