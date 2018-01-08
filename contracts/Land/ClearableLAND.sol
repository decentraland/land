pragma solidity ^0.4.18;

import '../Upgradable/Ownable.sol';
import '../AssetRegistry/InternalOperationsAssetRegistry.sol';
import './ILANDRegistry.sol';
import './LANDStorage.sol';

contract ClearableLAND is InternalOperationsAssetRegistry, Ownable, LANDStorage, ILANDRegistry {

  function ping() public {
    latestPing[msg.sender] = now;
  }

  function setLatestToNow(address user) onlyOwner public {
    latestPing[user] = now;
  }

  function clearLand(int[] x, int[] y) public {
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
