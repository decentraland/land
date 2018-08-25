pragma solidity ^0.4.22;


contract MetadataHolderBase {
  bytes4 internal constant InterfaceId_GetMetadata = bytes4(keccak256("getMetadata(uint256)"));
}
