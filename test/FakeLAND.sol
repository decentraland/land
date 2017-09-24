pragma solidity ^0.4.15;

import '../contracts/BasicNFT.sol';

contract FakeLAND is BasicNFT {
  function create(uint tokenId, address owner) {
    _addTokenTo(owner, tokenId);
    totalTokens++;

    TokenCreated(tokenId, owner, '');
  }
}
