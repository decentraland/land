pragma solidity ^0.4.18;

interface ILANDRegistry {

  // LAND can be assigned by the owner
  function assignNewParcel(int x, int y, address beneficiary) external;
  function assignMultipleParcels(int[] x, int[] y, address beneficiary) external;

  // After one year, LAND can be claimed from an inactive public key
  function ping() external;

  // LAND-centric getters
  function encodeTokenId(int x, int y) external pure returns (uint256);
  function decodeTokenId(uint value) external pure returns (int, int);
  function exists(int x, int y) external view returns (bool);
  function ownerOfLand(int x, int y) external view returns (address);
  function ownerOfLandMany(int[] x, int[] y) external view returns (address[]);
  function landOf(address owner) external view returns (int[], int[]);
  function landData(int x, int y) external view returns (string);

  // Transfer LAND
  function transferLand(int x, int y, address to) external;
  function transferManyLand(int[] x, int[] y, address to) external;

  // Update LAND
  function updateLandData(int x, int y, string data) external;
  function updateManyLandData(int[] x, int[] y, string data) external;

  // Authorize an updateManager to manage parcel data
  function setUpdateManager(address _owner, address _operator, bool _approved) external;

  // Events

  event Update(
    uint256 indexed assetId,
    address indexed holder,
    address indexed operator,
    string data
  );

  event UpdateOperator(
    uint256 indexed assetId,
    address indexed operator
  );

  event UpdateManager(
    address indexed _owner,
    address indexed _operator,
    address indexed _caller,
    bool _approved
  );

  event DeployAuthorized(
    address indexed _caller,
    address indexed _deployer
  );

  event DeployForbidden(
    address indexed _caller,
    address indexed _deployer
  );
}
