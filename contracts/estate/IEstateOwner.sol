pragma solidity ^0.4.22;

contract IEstateOwner {

  function transferOwnership(address to) external;

  function detectReceived(uint256 tokenId) external;

  function send(uint256 tokenId, address destinatory) external;

  function size() external view returns (uint256);

  function getMetadata(uint256 assetId) view external;

  function setUpdateOperator(address _operator) external;

  function isUpdateAuthorized(address _operator) external view;

  function ping() external;

}
