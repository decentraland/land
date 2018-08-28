pragma solidity ^0.4.22;

import '../contracts/estate/EstateRegistry.sol';

contract EstateRegistryTest is EstateRegistry {
  constructor(
    string _name,
    string _symbol,
    address _registry
  )
    public
  {
    EstateRegistry.initialize(_name, _symbol, _registry);
  }

  function mintEstate(address to, string metadata) public returns (uint256) {
    return _mintEstate(to, metadata);
  }

  function getMetadataInterfaceId() pure returns (bytes4) {
    return InterfaceId_GetMetadata;
  }
}
