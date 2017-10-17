pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

import './Land.sol';

contract BurnableToken {
  function burn(uint);
  function transferFrom(address, address, uint256);
}

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

  function buy(uint x, uint y, string data, address _beneficiary, address _from) public {
    address from = _from;
    if (from == 0) {
      from = msg.sender;
    }
    address beneficiary = _beneficiary;
    if (beneficiary == 0) {
      beneficiary = msg.sender;
    }
    if (exists(x, y)) {
      revert();
    }
    if (!exists(x-1, y) && !exists(x+1, y) && !exists(x, y-1) && !exists(x, y+1)) {
      revert();
    }
    uint cost = 1000 * 1e18;
    token.transferFrom(from, this, cost);
    token.burn(cost);
    return land.assignNewParcel(beneficiary, buildTokenId(x, y), data);
  }
}
