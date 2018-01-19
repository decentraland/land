pragma solidity ^0.4.18;

import '../contracts/land/LANDRegistry.sol';

contract LANDRegistryTest is LANDRegistry {
  function existsProxy(int x, int y) view public returns (bool) {
    return exists(encodeTokenId(x, y));
  }
}