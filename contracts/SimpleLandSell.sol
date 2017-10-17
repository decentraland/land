pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract BurnableToken {
  function transferFrom(address, address, uint) public returns (bool);
  function burn(uint) public;
}

import './Land.sol';

contract SimpleLandSell is Ownable {

  BurnableToken public token;
  Land public land;

  function SimpleLandSell(address _token) {
    token = BurnableToken(_token);
    land = deployLand();

    land.assignNewParcel(msg.sender, buildTokenId(0, 0), '42');
  }

  function deployLand() internal returns (Land) {
    return new Land(this);
  }

  function exists(uint x, uint y) public constant returns (bool) {
    return land.exists(x, y);
  }

  function buildTokenId(uint x, uint y) public constant returns (uint256) {
    return land.buildTokenId(x, y);
  }

  event Log(string info);

  function buy(uint x, uint y, string data) public {
    _buyLand(x, y, data, msg.sender, msg.sender);
  }

  function _buyLand(uint x, uint y, string metadata, address beneficiary, address fromAccount) internal {
    if (exists(x, y)) {
      revert();
    }
    if (!exists(x-1, y) && !exists(x+1, y) && !exists(x, y-1) && !exists(x, y+1)) {
      revert();
    }
    uint cost = 1e21;
    if (!token.transferFrom(fromAccount, this, cost)) {
      revert();
    }
    token.burn(cost);
    return land.assignNewParcel(beneficiary, buildTokenId(x, y), metadata);
  }
}
