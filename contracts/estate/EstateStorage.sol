pragma solidity ^0.4.23;

contract LANDRegistry {
  function ping() public;
  function ownerOf(uint256 tokenId) public returns (address);
  function safeTransferFrom(address, address, uint256) public;
}


contract EstateStorage {
  LANDRegistry public registry;

  // From Estate to list of owned land ids (LANDs)
  mapping(uint256 => uint256[]) public estateLandIds;

  // From Land id (LAND) to its owner Estate id
  mapping(uint256 => uint256) public landIdEstate;

  // From Estate id to mapping of land id to index on the array above (estateLandIds)
  mapping(uint256 => mapping(uint256 => uint256)) public estateLandIndex;

  // Metadata of the Estate
  mapping(uint256 => string) internal estateData;

  // Operator of the Estate
  mapping (uint256 => address) internal updateOperator;
}
