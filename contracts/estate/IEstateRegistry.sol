pragma solidity ^0.4.22;


contract IEstateRegistry {
  function mintNext(address to) public returns (uint256);

  function getTokenEstateId(uint256 tokenId) external view returns(uint256);

  function transferOwnership(address to) external;

  function ammendReceived(uint256 tokenId) external;

  function getSize() external view returns (uint256);

  function getMetadata(uint256 assetId) view external;

  function updateMetadata(uint256 estateId, string metadata) external;

  function setUpdateOperator(address operator) external;

  function isUpdateAuthorized(address operator) external view;

  function ping() external;

}
