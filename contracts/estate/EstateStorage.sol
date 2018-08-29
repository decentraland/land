pragma solidity ^0.4.23;


contract LANDRegistry {
  function ping() public;
  function ownerOf(uint256 tokenId) public returns (address);
  function safeTransferFrom(address, address, uint256) public;
  function decodeTokenId(uint value) external pure returns (int, int);
  function updateLandData(int x, int y, string data) external;
}


contract EstateStorage {
  bytes4 internal constant InterfaceId_GetMetadata = bytes4(keccak256("getMetadata(uint256)"));

  LANDRegistry public registry;

  // From Estate to list of owned LAND ids (LANDs)
  mapping(uint256 => uint256[]) public estateLandIds;

  // From LAND id (LAND) to its owner Estate id
  mapping(uint256 => uint256) public landIdEstate;

  // From Estate id to mapping of LAND id to index on the array above (estateLandIds)
  mapping(uint256 => mapping(uint256 => uint256)) public estateLandIndex;

  // Metadata of the Estate
  mapping(uint256 => string) internal estateData;

  // Operator of the Estate
  mapping (uint256 => address) internal updateOperator;
}
