pragma solidity ^0.4.18;

import '../LANDRegistry.sol';

contract BurnableToken {
  function transferFrom(address, address, uint) public returns (bool);
  function burn(uint) public;
}

contract LANDSale {

  // MANA contract
  BurnableToken public token;

  // LAND contract that holds the registry
  LANDRegistry public land;

  event Log(string info);

  // @return true if LAND exists in the registry
  function exists(uint256 _x, uint256 _y) public constant returns (bool) {
    return land.exists(_x, _y);
  }

  function buildTokenId(uint256 _x, uint256 _y) public constant returns (uint256) {
    return land.buildTokenId(_x, _y);
  }

  function _isValidLand(uint256 _x, uint256 _y) internal returns (bool);

  function _buyLand(uint256 _x, uint256 _y, string _metadata, address _beneficiary, address _fromAccount, uint256 _cost) internal {
    require(!exists(_x, _y));
    require(_isValidLand(_x, _y));

    // Transfer funds to this contract to allow burning MANA
    if (!token.transferFrom(_fromAccount, this, _cost)) {
      revert();
    }
    token.burn(_cost);

    land.assignNewParcel(_beneficiary, buildTokenId(_x, _y), _metadata);
  }
}
