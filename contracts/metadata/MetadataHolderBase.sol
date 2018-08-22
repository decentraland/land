pragma solidity ^0.4.22;


contract MetadataHolderBase {
  bytes4 constant public GET_METADATA = bytes4(keccak256("getMetadata(uint256)"));
  bytes4 constant public ERC165_SUPPORT = bytes4(keccak256("supportsInterface(bytes4)"));

  function supportsInterface(bytes4 _interfaceId) external view returns (bool) {
    return ((_interfaceId == ERC165_SUPPORT) ||
      (_interfaceId == GET_METADATA));
  }
}
