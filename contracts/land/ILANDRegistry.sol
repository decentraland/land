pragma solidity ^0.4.18;

interface ILANDRegistry {

  // LAND can be assigned by the owner
  function assignNewParcel(int x, int y, address beneficiary) external;
  function assignMultipleParcels(int[] x, int[] y, address beneficiary) external;

  // After one year, land can be claimed from an inactive public key
  function ping() external;

  // LAND-centric getters
  function encodeTokenId(int x, int y) pure external returns (uint256);
  function decodeTokenId(uint value) pure external returns (int, int);
  function exists(int x, int y) view external returns (bool);
  function ownerOfLand(int x, int y) view external returns (address);
  function ownerOfLandMany(int[] x, int[] y) view external returns (address[]);
  function landOf(address owner) view external returns (int[], int[]);
  function landData(int x, int y) view external returns (string);

  // Transfer LAND
  function transferLand(int x, int y, address to) external;
  function transferManyLand(int[] x, int[] y, address to) external;

  // Update LAND
  function updateLandData(int x, int y, string data) external;
  function updateManyLandData(int[] x, int[] y, string data) external;

  // Events

  event Update(  
    uint256 indexed assetId, 
    address indexed holder,  
    address indexed operator,  
    string data  
  );
}
