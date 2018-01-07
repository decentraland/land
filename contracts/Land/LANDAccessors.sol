pragma solidity ^0.4.18;

import '../AssetRegistry/IAssetRegistry.sol';
import './ILANDRegistry.sol';
import './LANDStorage.sol';

contract LANDAccessors is IAssetRegistry, ILANDRegistry {

  uint256 constant clearLow = 0xffffffffffffffff0000000000000000;
  uint256 constant clearHigh = 0x0000000000000000ffffffffffffffff;

  function buildTokenId(uint x, uint y) view public returns (uint256) {
    return ((x << 128) & clearLow) | (y & clearHigh);
  }

  function exists(uint x, uint y) view public returns (bool) {
    return exists(buildTokenId(x, y));
  }
  function ownerOfLand(uint x, uint y) view public returns (address) {
    return holderOf(buildTokenId(x, y));
  }
  function landData(uint x, uint y) view public returns (string) {
    return assetData(buildTokenId(x, y));
  }
}
