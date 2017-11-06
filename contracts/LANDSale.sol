pragma solidity ^0.4.15;

contract BurnableToken {
  function transferFrom(address, address, uint) public returns (bool);
  function burn(uint) public;
}

import './LANDToken.sol';

contract LANDSale {
  
  BurnableToken public token;
  LANDToken public land;

  event Log(string info);

  function exists(uint x, uint y) public constant returns (bool) {
    return land.exists(x, y);
  }

  function buildTokenId(uint x, uint y) public constant returns (uint256) {
    return land.buildTokenId(x, y);
  }

  function _isValidLand(uint256 _x, uint256 _y) internal returns (bool);

  function _buyLand(uint x, uint y, string metadata, address beneficiary, address fromAccount, uint cost) internal {
    require(!exists(x, y));
    require(_isValidLand(x, y));

    // Transfer funds to this contract to allow burning MANA
    if (!token.transferFrom(fromAccount, this, cost)) {
      revert();
    }
    token.burn(cost);

    land.assignNewParcel(beneficiary, buildTokenId(x, y), metadata);
  }
}
