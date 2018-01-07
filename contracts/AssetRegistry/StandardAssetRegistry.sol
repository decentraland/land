pragma solidity ^0.4.18;

import './Storage.sol';
import './IAssetRegistry.sol';

import './GlobalAssetRegistry.sol';
import './AssetAccessRegistry.sol';
import './HolderAccessRegistry.sol';
import './TransferableAssetRegistry.sol';

contract StandardAssetRegistry is
  AssetRegistryStorage, IAssetRegistry,
  GlobalAssetRegistry, AssetAccessRegistry, HolderAccessRegistry,
  InternalOperationsAssetRegistry,
  TransferableAssetRegistry, UpdatableAssetRegistry,
  SupplyAssetRegistry, AuthorizedAssetRegistry
{
}
