pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './LANDSale.sol';
import './ReturnVestingRegistry.sol';

/**
 * @title LANDTerraformSale
 * @dev A contract for managing the terraform event, an auctioned sale of LAND
 */
contract LANDTerraformSale is LANDSale, Ownable {

  // contract for mapping return address of vested accounts
  ReturnVestingRegistry public returnVesting;

  // address of the contract that holds the reserve of staked MANA
  address public terraformReserve;

  /** 
    * @dev Constructor
    * @param _token MANA token contract address
    * @param _terraformReserve address of the contract that holds the staked funds for the auction
    * @param _returnVesting address of the contract for vested account mapping
    */
  function LANDTerraformSale(address _token, address _terraformReserve, address _returnVesting) {
    token = BurnableToken(_token);
    returnVesting = ReturnVestingRegistry(_returnVesting);
    terraformReserve = _terraformReserve;

    land = _deployLand();
  }

  /** 
    * @dev Buy one LAND
    * @param _buyer Address of the buyer
    * @param _x X coordinate of LAND
    * @param _y Y coordinate of LAND
    * @param _cost Amount of MANA to burn
    */
  function buy(address _buyer, uint256 _x, uint256 _y, uint256 _cost) onlyOwner public {
    _buyLand(_x, _y, '', _buyer, terraformReserve, _cost);
  }

  /** 
    * @dev Buy a number of LAND in bulk
    * @param _buyer Address of the buyer
    * @param _x Array of X coordinates of LAND to buy
    * @param _y Array of Y coordinates of LAND to buy
    * @param _totalCost Total amount of MANA to burn
    */
  function buyMany(address _buyer, uint256[] _x, uint256[] _y, uint256 _totalCost) onlyOwner public {
    require(_x.length == _y.length);

    // Transfer funds from reserve to this contract to allow burning MANA
    if (!token.transferFrom(terraformReserve, this, _totalCost)) {
      revert();
    }
    token.burn(_totalCost);

    for (uint256 i = 0; i < _x.length; i++) {
      land.assignNewParcel(_buyer, buildTokenId(_x[i], _y[i]), '');
    }
  }

  /** 
    * @dev Transfer back remaining MANA to account
    * @param _address Address of the account to return MANA to
    * @param _amount Amount of MANA to return
    */
  function transferBackMANA(address _address, uint256 _amount) onlyOwner public {
    require(_address != address(0));
    require(_amount > 0);

    address returnAddress = _address;

    // Use vesting return address if present
    if (returnVesting != address(0)) {
      address mappedAddress = returnVesting.returnAddress(_address);
      if (mappedAddress != address(0)) {
        returnAddress = mappedAddress;
      }
    }

    // Funds are always transferred from reserve
    require(token.transferFrom(terraformReserve, returnAddress, _amount));
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
