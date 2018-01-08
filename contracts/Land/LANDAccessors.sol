pragma solidity ^0.4.18;

import '../AssetRegistry/IAssetRegistry.sol';
import './ILANDRegistry.sol';
import './LANDStorage.sol';

contract LANDAccessors is IAssetRegistry, ILANDRegistry {

  uint256 constant clearLow = 0xffffffffffffffffffffffffffffffff00000000000000000000000000000000;
  uint256 constant clearHigh = 0x00000000000000000000000000000000ffffffffffffffffffffffffffffffff;
  uint256 constant factor = 0x100000000000000000000000000000000;

  function buildTokenId(int x, int y) view public returns (uint b) {
    b = ((uint(x) * factor) & clearLow) + (uint(y) & clearHigh);
  }

  function exists(int x, int y) view public returns (bool) {
    return exists(buildTokenId(x, y));
  }
  function ownerOfLand(int x, int y) view public returns (address) {
    return holderOf(buildTokenId(x, y));
  }
  function landData(int x, int y) view public returns (string) {
    return assetData(buildTokenId(x, y));
  }
}
