pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './Land.sol';
import './LandSell.sol';

contract SimpleLandSell is LandSell, Ownable {

  uint public constant LAND_MANA_COST = 1e21;

  function SimpleLandSell(address _token, address _land) {
    token = BurnableToken(_token);
    land = Land(_land);
  }

  function buy(uint x, uint y, string data) public {
    _buyLand(x, y, data, msg.sender, msg.sender, LAND_MANA_COST);
  }

  function isValidLand(uint x, uint y) internal returns (bool) {
    return exists(x-1, y) || exists(x+1, y) || exists(x, y-1) || exists(x, y+1);
  }
}
