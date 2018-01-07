pragma solidity ^0.4.18;

import './Storage.sol';

/**
 * Transfer Operations
 */
contract TransferableRegistry is AssetRegistryStorage, AuthorizedAssetRegistry {

  modifier onlyHolder(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender);
    _;
  }

  modifier onlyOperator(uint256 assetId) {
    bool allowed = _holderOf[assetId] == msg.sender;
    uint index;
    uint length;

    // Now, check if the operator is generally allowed by the holder
    address[] operators = _operators[_holderOf[assetId]];
    length = operators.length;
    for (index = 0; !allowed && index < operators.length; index++) {
      if (operators[iter] == msg.sender) {
        allowed = true;
      }
    }

    require(allowed);
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
    return doSend(_to, _assetId, _userData, msg.sender, operatorData);
  }

  function doSend(
    address _to, uint256 assetId, bytes userData, address operator, bytes operatorData
  )
    internal
  {
    address holder = _holderOf[tokenId];
    _removeAssetFrom(holder, assetId);
    _addAssetTo(_to, assetId);

    Transfer(holder, _to, assetId, operator, userData, operatorData);
  }
}
