pragma solidity ^0.4.18;

import '../AssetRegistry/IAssetRegistry.sol';

interface ILANDRegistry {
  function assignNewParcel(int x, int y, address beneficiary, string data) public;
  function assignNewParcel(int x, int y, address beneficiary) public;
  function assignMultipleParcels(int[] x, int[] y, address beneficiary) public;

  function ping() public;
  function clearLand(int[] x, int[] y) public;

  function buildTokenId(int x, int y) view public returns (uint256);
  function exists(int x, int y) view public returns (bool);
  function ownerOfLand(int x, int y) view public returns (address);
  function landData(int x, int y) view public returns (string);

  function transferLand(int x, int y, address to) public;
  function transferManyLand(int[] x, int[] y, address to) public;

  function updateLandData(int x, int y, string _metadata) public;
  function updateManyLandData(int[] x, int[] y, string data) public;
}
