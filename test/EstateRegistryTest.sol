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

  function calculateEstateHash(uint256 estateId, uint256[] tokens) public pure returns (bytes32) {
    bytes32 result = keccak256(abi.encodePacked('estateId', estateId));

    uint256 length = tokens.length;
    for (uint i = 0; i < length; i++) {
      result ^= keccak256(abi.encodePacked(tokens[i]));
    }
    return result;
  }

  function compoundXor(bytes32 x, uint256 y) public pure returns (bytes32) {
    return x ^ keccak256(abi.encodePacked(y));
  }
}
