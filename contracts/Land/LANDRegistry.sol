pragma solidity ^0.4.18;

import '../Upgradable/Ownable.sol';
import '../Upgradable/IApplication.sol';

import '../AssetRegistry/StandardAssetRegistry.sol';

import './LANDStorage.sol';
import './ILANDRegistry.sol';
import './LANDAccessors.sol';
import './AssignableLAND.sol';
import './ClearableLAND.sol';
import './TransferableLAND.sol';
import './UpdatableLAND.sol';

contract LANDRegistry is StandardAssetRegistry,
  LANDStorage, ILANDRegistry, LANDAccessors,
  AssignableLAND, ClearableLAND, TransferableLAND, UpdatableLAND
{
  function initialize(bytes data) public {
    initialize();
  }

  function initialize() public {
    if (owner != 0) {
      return;
    }
    owner = msg.sender;
    _name = 'Decentraland Land';
    _symbol = 'LAND';
    _description = 'Contract that stores the Decentraland LAND registry';
  }
}
