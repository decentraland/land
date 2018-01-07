pragma solidity ^0.4.18;

import '../Upgradable/Ownable.sol';
import './LANDStorage.sol';
import './ILANDRegistry.sol';

contract AssignableLAND is Ownable, LANDStorage, ILANDRegistry {

  function assignNewParcel(uint x, uint y, address beneficiary, string data) public {
    create(buildTokenId(x, y), beneficiary, data);
  }

  function assignNewParcel(uint x, uint y, address beneficiary, uint tokenId) public {
    create(buildTokenId(x, y), beneficiary, '');
  }

  function assignMultipleParcels(uint[] x, uint[] y, address beneficiary, uint tokenId) public {
    for (uint i = 0; i < x.length; i++) {
      create(buildTokenId(x[i], y[i]), beneficiary, '');
    }
  }

  function assignMultipleParcels(uint[] x, uint[] y, address[] beneficiary, uint tokenId) public {
    for (uint i = 0; i < x.length; i++) {
      create(buildTokenId(x[i], y[i]), beneficiary, '');
    }
  }

  function create(uint256 _assetId, address _beneficiary, string _data) onlyOwner public {
    require(_holderOf[_assetId] == 0);
    _addAssetTo(_beneficiary, _assetId, _data);
    Create(_beneficiary, _assetId, msg.sender, _data);
  }

  function destroy(uint256 _assetId) onlyOwner public {
    _removeAssetFrom(holder, _assetId);
    Destroy(holder, _assetId, msg.sender);
  }
}
