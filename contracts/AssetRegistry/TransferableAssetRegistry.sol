pragma solidity ^0.4.18;

import './Storage.sol';
import './AuthorizedAssetRegistry.sol';
import './InternalOperationsAssetRegistry.sol';

/**
 * Transfer Operations
 */
contract TransferableAssetRegistry is AssetRegistryStorage, IAssetRegistry, InternalOperationsAssetRegistry, AuthorizedAssetRegistry {

  modifier onlyHolder(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender);
    _;
  }

  modifier onlyOperator(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender
         || isOperatorAuthorizedFor(msg.sender, _holderOf[assetId]));
    _;
  }

  function send(address _to, uint256 _assetId)
    onlyHolder(_assetId)
    public
  {
    return doSend(_to, _assetId, '', 0, '');
  }

  function send(address _to, uint256 _assetId, bytes _userData)
    onlyHolder(_assetId)
    public
  {
    return doSend(_to, _assetId, _userData, 0, '');
  }

  function operatorSend(
    address _to, uint256 _assetId, bytes userData, bytes operatorData
  )
    onlyOperator(_assetId)
    public
  {
    return doSend(_to, _assetId, userData, msg.sender, operatorData);
  }

  function doSend(
    address _to, uint256 assetId, bytes userData, address operator, bytes operatorData
  )
    internal
  {
    address holder = _holderOf[assetId];
    _removeAssetFrom(holder, assetId);
    _addAssetTo(_to, assetId);

    Transfer(holder, _to, assetId, operator, userData, operatorData);
  }
}
