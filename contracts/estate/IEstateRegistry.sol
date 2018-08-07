pragma solidity ^0.4.22;


contract IEstateRegistry {
  function mint(address to, string metadata) external returns (uint256);

  // Events

  event CreateEstate(
    address indexed owner,
    uint256 indexed estateId,
    string data
  );

  event AddLand(
    uint256 indexed estateId,
    uint256 indexed landId
  );

  event RemoveLand(
    uint256 indexed estateId,
    uint256 indexed landId,
    address indexed destinatary
  );

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

  event SetPingableDAR(
    address indexed registry
  );
}
