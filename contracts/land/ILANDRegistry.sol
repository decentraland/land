pragma solidity ^0.4.18;

interface ILANDRegistry {

  // LAND can be assigned by the owner
  function assignNewParcel(int x, int y, address beneficiary) public;
  function assignMultipleParcels(int[] x, int[] y, address beneficiary) public;

  // After one year, land can be claimed from an inactive public key
  function ping() public;
  function clearLand(int[] x, int[] y) public;

  // LAND-centric getters
  function encodeTokenId(int x, int y) view public returns (uint256);
  function decodeTokenId(uint value) view public returns (int, int);
  function exists(int x, int y) view public returns (bool);
  function ownerOfLand(int x, int y) view public returns (address);
  function ownerOfLandMany(int[] x, int[] y) view public returns (address[]);
  function landOf(address owner) view public returns (int[], int[]);
  function landData(int x, int y) view public returns (string);

  // Transfer LAND
  function transferLand(int x, int y, address to) public;
  function transferManyLand(int[] x, int[] y, address to) public;

  // Update LAND
  function updateLandData(int x, int y, string data) public;
  function updateManyLandData(int[] x, int[] y, string data) public;

  // Events

  event Update(  
    uint256 indexed assetId, 
    address indexed holder,  
    address indexed operator,  
    string data  
  );
}
