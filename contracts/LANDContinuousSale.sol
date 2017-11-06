pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './LANDToken.sol';
import './LANDSale.sol';

contract LANDContinuousSale is LANDSale, Ownable {

  uint public constant LAND_MANA_COST = 1e21;

  function LANDContinuousSale(address _token, address _land) {
    token = BurnableToken(_token);
    land = LANDToken(_land);
  }

  function buy(uint x, uint y, string data) public {
    _buyLand(x, y, data, msg.sender, msg.sender, LAND_MANA_COST);
  }

  function _isValidLand(uint256 _x, uint256 _y) internal returns (bool) {
    return exists(_x-1, _y) || exists(_x+1, _y) || exists(_x, _y-1) || exists(_x, _y+1);
  }
}
