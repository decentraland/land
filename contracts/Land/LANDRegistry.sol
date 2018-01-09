pragma solidity ^0.4.18;

import '../Storage.sol';

import '../Upgradable/Ownable.sol';

import '../Upgradable/IApplication.sol';

import '../AssetRegistry/StandardAssetRegistry.sol';

import './ILANDRegistry.sol';

contract LANDRegistry is Storage,
  Ownable, StandardAssetRegistry,
  IApplication, ILANDRegistry
{

  function initialize(bytes /* data */) onlyOwner public {
    _name = 'Decentraland LAND';
    _symbol = 'LAND';
    _description = 'Contract that stores the Decentraland LAND registry';
  }

  //
  // Land is assignable by the owner
  //

  function assignNewParcel(int x, int y, address beneficiary, string data) public {
    generate(buildTokenId(x, y), beneficiary, data);
  }

  function assignNewParcel(int x, int y, address beneficiary) public {
    generate(buildTokenId(x, y), beneficiary, '');
  }

  function assignMultipleParcels(int[] x, int[] y, address beneficiary) public {
    for (uint i = 0; i < x.length; i++) {
      generate(buildTokenId(x[i], y[i]), beneficiary, '');
    }
  }

  function generate(uint256 _assetId, address _beneficiary, string _data) onlyOwner public {
    doGenerate(_assetId, _beneficiary, _data);
  }

  function destroy(uint256 _assetId) onlyOwner public {
    _removeAssetFrom(_holderOf[_assetId], _assetId);
    Destroy(_holderOf[_assetId], _assetId, msg.sender);
  }

  //
  // Inactive keys after 1 year lose ownership
  //

  function ping() public {
    latestPing[msg.sender] = now;
  }

  function setLatestToNow(address user) onlyOwner public {
    latestPing[user] = now;
  }

  function clearLand(int[] x, int[] y) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      uint landId = buildTokenId(x[i], y[i]);
      address holder = holderOf(landId);
      if (latestPing[holder] < now - 1 years) {
        _removeAssetFrom(holder, landId);
        Destroy(holder, landId, msg.sender);
      }
    }
  }

  //
  // LAND Getters
  //

  function buildTokenId(int x, int y) view public returns (uint) {
    return ((uint(x) * factor) & clearLow) | (uint(y) & clearHigh);
  }

  function exists(int x, int y) view public returns (bool) {
    return exists(buildTokenId(x, y));
  }

  function ownerOfLand(int x, int y) view public returns (address) {
    return holderOf(buildTokenId(x, y));
  }

  function landData(int x, int y) view public returns (string) {
    return assetData(buildTokenId(x, y));
  }

  //
  // Transfer LAND
  //

  function transferLand(int x, int y, address to) public {
    return transfer(to, buildTokenId(x, y));
  }

  function transferManyLand(int[] x, int[] y, address to) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      return transfer(to, buildTokenId(x[i], y[i]));
    }
  }

  //
  // Update LAND
  //
  function updateLandData(int x, int y, string _metadata) public {
    return update(buildTokenId(x, y), _metadata);
  }

  function updateManyLandData(int[] x, int[] y, string data) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      update(buildTokenId(x[i], y[i]), data);
    }
  }
}
