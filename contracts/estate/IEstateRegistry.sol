pragma solidity ^0.4.22;


contract IEstateRegistry {
  function mint(address to) external returns (uint256);

  function getLandEstateId(uint256 landId) external view returns(uint256);

  function updateMetadata(uint256 estateId, string metadata) external;

  // Events

  event Update(
    uint256 indexed assetId,
    address indexed holder,
    address indexed operator,
    string data
  );

  event UpdateOperator(
    uint256 indexed estateId,
    address indexed operator
  );

  event AmmendReceived(
    uint256 indexed estateId,
    uint256 indexed landId
  );

  event SetPingableDAR(
    address indexed dar
  );
}