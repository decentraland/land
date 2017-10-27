pragma solidity ^0.4.15;

contract BurnableToken {
  function transferFrom(address, address, uint) public returns (bool);
  function burn(uint) public;
}

import './Land.sol';

contract LandSell {
  
  BurnableToken public token;
  Land public land;

  event Log(string info);

  function exists(uint x, uint y) public constant returns (bool) {
    return land.exists(x, y);
  }

  function buildTokenId(uint x, uint y) public constant returns (uint256) {
    return land.buildTokenId(x, y);
  }

  function deployLand() internal returns (Land) {
    return new Land();
  }

  function isValidLand(uint x, uint y) internal returns (bool);

  function _buyLand(uint x, uint y, string metadata, address beneficiary, address fromAccount, uint cost) internal {
    if (exists(x, y)) {
      revert();
    }
    if (!isValidLand(x, y)) {
      revert();
    }
    if (!token.transferFrom(fromAccount, this, cost)) {
      revert();
    }

    token.burn(cost);
    return land.assignNewParcel(beneficiary, buildTokenId(x, y), metadata);
  }
}
