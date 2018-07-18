pragma solidity ^0.4.22;


contract IEstateRegistry {
  function mintNext(address to) public returns (uint256);

  function getTokenEstateId(uint256 tokenId) external view returns(uint256);

  function updateMetadata(uint256 estateId, string metadata) external;
}
