pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './LANDSale.sol';

contract ReturnVestingRegistry is Ownable {
  mapping (address => address) public returnAddress;
}

contract LANDTerraformSale is LANDSale, Ownable {

  ReturnVestingRegistry public returnRegistry;
  address public terraformReserve;

  string public constant EMPTY_METADATA = '';

  function LANDTerraformSale(address _token, address _terraformReserve, address _returnRegistry) {
    token = BurnableToken(_token);
    returnRegistry = ReturnVestingRegistry(_returnRegistry);
    terraformReserve = _terraformReserve;

    land = deployLand();
  }

  function buy(address _buyer, uint256 _x, uint256 _y, uint256 _cost) onlyOwner public {
    _buyLand(_x, _y, EMPTY_METADATA, _buyer, terraformReserve, _cost);
  }

  function buyMany(address _buyer, uint256[] _x, uint256[] _y, uint256 _totalCost) onlyOwner public {
    require(_x.length == _y.length);

    // Transfer funds from reserve to this contract to allow burning MANA
    if (!token.transferFrom(terraformReserve, this, _totalCost)) {
      revert();
    }
    token.burn(_totalCost);

    for (uint256 i = 0; i < _x.length; i++) {
      land.assignNewParcel(_buyer, buildTokenId(_x[i], _y[i]), EMPTY_METADATA);
    }
  }

  function transferBackMANA(address _address, uint256 _amount) onlyOwner public {
    require(_address != address(0));
    require(_amount > 0);

    address returnAddress = _address;

    // Use vesting return address if present
    if (returnRegistry != address(0)) {
      address mappedAddress = returnRegistry.returnAddress(_address);
      if (mappedAddress != address(0)) {
        returnAddress = mappedAddress;
      }
    }

    // Funds are always transferred from reserve
    require(token.transferFrom(terraformReserve, returnAddress, _amount));
  }

  function transferLandOwnership(address _newOwner) onlyOwner public {
    land.transferOwnership(_newOwner);
  }

  function deployLand() internal returns (LANDToken) {
    return new LANDToken();
  }

  function _isValidLand(uint256 _x, uint256 _y) internal returns (bool) {
    return true;
  }
}
