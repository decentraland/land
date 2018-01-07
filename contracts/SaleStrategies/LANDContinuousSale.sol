pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import '../LANDRegistry.sol';
import './LANDSale.sol';

contract LANDContinuousSale is LANDSale, Ownable {

  // fixed MANA to LAND cost
  uint256 public constant LAND_MANA_COST = 1e21;

  function LANDContinuousSale(address _token, address _land) public {
    token = BurnableToken(_token);
    land = LANDRegistry(_land);
  }

  /** 
    * @dev Transfer ownership of LAND contract
    * @param _newOwner The address of the new owner of the LAND contract
    */
  function transferLandOwnership(address _newOwner) onlyOwner public {
    land.transferOwnership(_newOwner);
  }

  function buy(uint256 _x, uint256 _y, string _data) public {
    _buyLand(_x, _y, _data, msg.sender, msg.sender, LAND_MANA_COST);
  }

  function _isValidLand(uint256 _x, uint256 _y) internal returns (bool) {
    return exists(_x-1, _y) || exists(_x+1, _y) || exists(_x, _y-1) || exists(_x, _y+1);
  }
}
