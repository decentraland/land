pragma solidity ^0.4.18;

import './Storage.sol';
import './IAssetRegistry.sol';

/**
 * Supply-altering operations
 */
contract SupplyAssetRegistry is AssetRegistryStorage, IAssetRegistry,
  AuthorizedAssetRegistry, InternalOperationsAssetRegistry
{

  function create(uint256 _assetId) public {
    require(_holderOf[_assetId] == 0);

    _addAssetTo(msg.sender, _assetId, '');

    Create(msg.sender, _assetId, msg.sender, _data);
  }

  function create(uint256 _assetId, string _data) public {
    require(_holderOf[_assetId] == 0);

    _addAssetTo(msg.sender, _assetId, _data);

    Create(msg.sender, _assetId, msg.sender, _data);
  }

  function create(uint256 _assetId, address _beneficiary, string _data) public {
    require(_holderOf[_assetId] == 0);

    _addAssetTo(_beneficiary, _assetId, _data);

    Create(_beneficiary, _assetId, msg.sender, _data);
  }

  function destroy(uint256 _assetId) public {
    address holder = _holderOf[_assetId];
    require(holder != 0);

    require(holder == msg.sender
         || isOperatorAuthorizedFor(msg.sender, holder));

    _removeAssetFrom(holder, _assetId);
    _assetData[_assetId] = 0;

    Destroy(holder, _assetId, msg.sender, data);
  }
}
