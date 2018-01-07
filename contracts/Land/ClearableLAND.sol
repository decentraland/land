pragma solidity ^0.4.18;

import './ILANDRegistry.sol';
import './LANDStorage.sol';

contract ClearableLAND is ILANDRegistry, LANDStorage {
  function ping() public {
    latestPing[msg.sender] = now;
  }

  function clearLand(uint[] x, uint[] y) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      uint landId = buildTokenId(x[i], y[i]);
      address holder = holderOf(landId);
      if (latestPing[holder] < now - 1 years) {
        _removeAssetFrom(holder, landId);
        Destroy(holder, landId, msg.sender);
      }
    }
  }
}
