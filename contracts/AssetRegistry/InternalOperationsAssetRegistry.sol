pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import './Storage.sol';
import './IAssetRegistry.sol';
import './GlobalAssetRegistry.sol';
import './AssetAccessRegistry.sol';
import './HolderAccessRegistry.sol';

contract InternalOperationsAssetRegistry is AssetRegistryStorage,
  IAssetRegistry,
  GlobalAssetRegistry, AssetAccessRegistry, HolderAccessRegistry
{
  using SafeMath for uint256;

  function _addAssetTo(address _to, uint256 _assetId) internal {
    _holderOf[_assetId] = _to;

    uint256 length = assetsCount(_to);

    _assetsOf[_to].push(_assetId);

    _indexOfAsset[_assetId] = length;

    _count = _count.add(1);
  }

  function _addAssetTo(address _to, uint256 _assetId, string _data) internal {
    _addAssetTo(_to, _assetId);

    _assetData[_assetId] = _data;
  }

  function _removeAssetFrom(address _from, uint256 _assetId) internal {
    uint256 assetIndex = _indexOfAsset[_assetId];
    uint256 lastAssetIndex = assetsCount(_from).sub(1);
    uint256 lastAssetId = _assetsOf[_from][lastAssetIndex];

    _holderOf[_assetId] = 0;

    // Insert the last asset into the position previously occupied by the asset to be removed
    _assetsOf[_from][assetIndex] = lastAssetId;

    // Resize the array
    _assetsOf[_from][lastAssetIndex] = 0;
    _assetsOf[_from].length--;

    // Remove the array if no more assets are owned to prevent pollution
    if (_assetsOf[_from].length == 0) {
      delete _assetsOf[_from];
    }

    // Update the index of positions for the asset
    _indexOfAsset[_assetId] = 0;
    _indexOfAsset[lastAssetId] = assetIndex;

    _count = _count.sub(1);
  }
}
