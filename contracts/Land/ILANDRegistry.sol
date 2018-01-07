pragma solidity ^0.4.18;

import '../AssetRegistry/IAssetRegistry';

contract ILANDRegistry is IAssetRegistry {
  function assignNewParcel(uint x, uint y, address beneficiary, uint tokenId, string data) public;
  function assignNewParcel(uint x, uint y, address beneficiary, uint tokenId) public;
  function assignMultipleParcels(uint[] x, uint[] y, address beneficiary, uint tokenId) public;
  function assignMultipleParcels(uint[] x, uint[] y, address[] beneficiary, uint tokenId) public;

  function ping() public;
  function clearLand(uint x[], uint y[]) public;

  function buildTokenId(uint x, uint y) view public returns (uint256);
  function exists(uint x, uint y) view public returns (bool);
  function ownerOfLand(uint x, uint y) view public returns (address);
  function landData(uint x, uint y) view public returns (string);

  function transferLand(uint x, uint y, address to) public;
  function transferManyLand(uint x[], uint y[], address to) public;
  function updateLandData(uint x, uint y, string _metadata) public;
  function updateManyLandData(uint[] x, uint[] y, string data) public;
}
