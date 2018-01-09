pragma solidity ^0.4.18;

interface ILANDRegistry {

  // LAND can be assigned by the owner
  function assignNewParcel(int x, int y, address beneficiary, string data) public;
  function assignNewParcel(int x, int y, address beneficiary) public;
  function assignMultipleParcels(int[] x, int[] y, address beneficiary) public;

  // After one year, land can be claimed from an inactive public key
  function ping() public;
  function clearLand(int[] x, int[] y) public;

  // LAND-centric getters
  function buildTokenId(int x, int y) view public returns (uint256);
  function exists(int x, int y) view public returns (bool);
  function ownerOfLand(int x, int y) view public returns (address);
  function landData(int x, int y) view public returns (string);

  // Transfer LAND
  function transferLand(int x, int y, address to) public;
  function transferManyLand(int[] x, int[] y, address to) public;

  // Update LAND
  function updateLandData(int x, int y, string data) public;
  function updateManyLandData(int[] x, int[] y, string data) public;
}
