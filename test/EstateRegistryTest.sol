pragma solidity ^0.4.22;

import '../contracts/estate/EstateRegistry.sol';

contract EstateRegistryTest is EstateRegistry {
  constructor(
    string _name,
    string _symbol,
    address _registry
  )
    EstateRegistry(_name, _symbol, _registry)
    public
  {}

  function mintEstate(address to, string metadata) public returns (uint256) {
    return _mintEstate(to, metadata);
  }

  function pushLandId(uint256 estateId, uint256 landId) external {
    _pushLandId(estateId, landId);
  }
}
