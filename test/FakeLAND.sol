pragma solidity ^0.4.15;

import '../contracts/LAND.sol';

contract FakeLAND is Land {
  function create(uint tokenId, address owner) {
    _addTokenTo(owner, tokenId);
    totalTokens++;

    TokenCreated(tokenId, owner, '');
  }
}

