pragma solidity ^0.4.18;

import '../Storage.sol';

import '../upgradable/Ownable.sol';

import '../upgradable/IApplication.sol';

import '../registry/StandardAssetRegistry.sol';

import './ILANDRegistry.sol';

contract LANDRegistry is Storage,
  Ownable, StandardAssetRegistry,
  ILANDRegistry
{

  function initialize(bytes /* data */) public {
    _name = 'Decentraland LAND';
    _symbol = 'LAND';
    _description = 'Contract that stores the Decentraland LAND registry';
  }

  //
  // Land is assignable by the owner
  //

  function assignNewParcel(int x, int y, address beneficiary, string data) public {
    generate(encodeTokenId(x, y), beneficiary, data);
  }

  function assignNewParcel(int x, int y, address beneficiary) public {
    generate(encodeTokenId(x, y), beneficiary, '');
  }

  function assignMultipleParcels(int[] x, int[] y, address beneficiary) public {
    for (uint i = 0; i < x.length; i++) {
      generate(encodeTokenId(x[i], y[i]), beneficiary, '');
    }
  }

  function generate(uint256 assetId, address beneficiary, string data) onlyOwner public {
    doGenerate(assetId, beneficiary, data);
  }

  function destroy(uint256 assetId) onlyOwner public {
    _removeAssetFrom(_holderOf[assetId], assetId);
    Destroy(_holderOf[assetId], assetId, msg.sender);
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
      uint landId = encodeTokenId(x[i], y[i]);
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

  function encodeTokenId(int x, int y) view public returns (uint) {
    return ((uint(x) * factor) & clearLow) | (uint(y) & clearHigh);
  }

  function decodeTokenId(uint value) view public returns (int, int) {
    uint x = (value & clearLow) >> 128;
    uint y = (value & clearHigh);
    return (expandNegative128BitCast(x), expandNegative128BitCast(y));
  }

  function expandNegative128BitCast(uint value) view public returns (int) {
    if (value & (1<<127) != 0) {
      return int(value | clearLow);
    }
    return int(value);
  }

  function exists(int x, int y) view public returns (bool) {
    return exists(encodeTokenId(x, y));
  }

  function ownerOfLand(int x, int y) view public returns (address) {
    return holderOf(encodeTokenId(x, y));
  }

  function ownerOfLandMany(int[] x, int[] y) view public returns (address[]) {
    require(x.length > 0);
    require(x.length == y.length);

    address[] memory addrs = new address[](x.length);
    for (uint i = 0; i < x.length; i++) {
      addrs[i] = ownerOfLand(x[i], y[i]);
    }

    return addrs;
  }

  function landOf(address owner) view public returns (int[], int[]) {
    uint256[] memory assets = assetsOf(owner);
    int[] memory x = new int[](assets.length);
    int[] memory y = new int[](assets.length);

    int assetX;
    int assetY;
    for (uint i = 0; i < assets.length; i++) {
      (assetX, assetY) = decodeTokenId(assets[i]);
      x[i] = assetX;
      y[i] = assetY;
    }

    return (x, y);
  }

  function landData(int x, int y) view public returns (string) {
    return assetData(encodeTokenId(x, y));
  }

  //
  // Transfer LAND
  //

  function transferLand(int x, int y, address to) public {
    return transfer(to, encodeTokenId(x, y));
  }

  function transferManyLand(int[] x, int[] y, address to) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      return transfer(to, encodeTokenId(x[i], y[i]));
    }
  }

  //
  // Update LAND
  //

  function updateLandData(int x, int y, string data) public {
    return update(encodeTokenId(x, y), data);
  }

  function updateManyLandData(int[] x, int[] y, string data) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      update(encodeTokenId(x[i], y[i]), data);
    }
  }
}
