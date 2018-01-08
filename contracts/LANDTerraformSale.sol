pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './LANDSale.sol';

/**
 * @title LANDTerraformSale
 * @dev A contract for managing the terraform event, an auctioned sale of LAND
 */
contract LANDTerraformSale is LANDSale, Ownable {

  /** 
    * @dev Constructor
    */
  function LANDTerraformSale() public {
    land = _deployLand();
  }

  /** 
    * @dev Buy one LAND
    * @param _buyer Address of the buyer
    * @param _x X coordinate of LAND
    * @param _y Y coordinate of LAND
    */
  function buy(address _buyer, uint256 _x, uint256 _y) onlyOwner public {
    require(!exists(_x, _y));
    require(_isValidLand(_x, _y));

    land.assignNewParcel(_buyer, buildTokenId(_x, _y), '');
  }

  /** 
    * @dev Buy a number of LAND in bulk
    * @param _buyer Address of the buyer
    * @param _x Array of X coordinates of LAND to buy
    * @param _y Array of Y coordinates of LAND to buy
    */
  function buyMany(address _buyer, uint256[] _x, uint256[] _y) onlyOwner public {
    require(_x.length == _y.length);

    for (uint256 i = 0; i < _x.length; i++) {
      land.assignNewParcel(_buyer, buildTokenId(_x[i], _y[i]), '');
    }
  }

  /**
    * @dev Transfer ownership of LAND contract
    * @param _newOwner The address of the new owner of the LAND contract
    */
  function transferLandOwnership(address _newOwner) onlyOwner public {
    land.transferOwnership(_newOwner);
  }

  /** 
    * @dev Deploy a new LAND token
    * @return A LANDToken contract
    */
  function _deployLand() internal returns (LANDToken) {
    return new LANDToken();
  }

  /** 
    * @dev Tell if an (x, y) coordinates are a valid LAND
    * @param _x X coordinate of LAND
    * @param _y Y coordinate of LAND
    * @return Always True as we don't do adjacency tests
    */
  function _isValidLand(uint256 _x, uint256 _y) internal returns (bool) {
    return true;
  }
}
