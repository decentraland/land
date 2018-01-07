pragma solidity ^0.4.18;

import './Storage.sol';
import './InternalOperationsAssetRegistry.sol';
import './AuthorizedAssetRegistry.sol';

/**
 * Supply-altering operations
 */
contract SupplyAssetRegistry is AssetRegistryStorage, IAssetRegistry,
  InternalOperationsAssetRegistry, AuthorizedAssetRegistry
{

  function create(uint256 _assetId) public {
    create(_assetId, msg.sender, '');
  }

  function create(uint256 _assetId, string _data) public {
    create(_assetId, msg.sender, _data);
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

    Destroy(holder, _assetId, msg.sender);
  }
}
