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

  function getMetadataInterfaceId() public pure returns (bytes4) {
    return InterfaceId_GetMetadata;
  }

  function calculateXor(uint256 x, uint256 y) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(x)) ^ keccak256(abi.encodePacked(y));
  }

  function compoundXor(bytes32 x, uint256 y) public pure returns (bytes32) {
    return x ^ keccak256(abi.encodePacked(y));
  }
}
