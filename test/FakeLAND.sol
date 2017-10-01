pragma solidity ^0.4.15;

import '../contracts/LAND.sol';

contract FakeLAND is Land {
  function FakeLAND() {
    Land(this);
  }

  function create(uint tokenId, address owner) {
    assignNewParcel(owner, tokenId, '');
  }
}

