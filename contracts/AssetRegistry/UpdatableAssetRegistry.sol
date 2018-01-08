pragma solidity ^0.4.18;

import './Storage.sol';
import './IAssetRegistry.sol';

/**
 * Data modification operations
 */
contract UpdatableAssetRegistry is AssetRegistryStorage, IAssetRegistry
{
  modifier onlyIfUpdateAllowed(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender
         || isOperatorAuthorizedFor(msg.sender, _holderOf[assetId]));
    _;
  }

  function update(uint256 _assetId, string _data) onlyIfUpdateAllowed(_assetId) public {
    _assetData[_assetId] = _data;
    Update(_assetId, _holderOf[_assetId], msg.sender, _data);
  }
}
