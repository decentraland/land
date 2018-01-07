pragma solidity ^0.4.18;

import './Storage.sol';

contract GlobalAssetRegistry is AssetRegistryStorage {
  function name() public constant returns (string) {
    return _name;
  }
  function symbol() public constant returns (string) {
    return _symbol;
  }
  function description() public constant returns (string) {
    return _description;
  }
  function totalSupply() public constant returns (uint256) {
    return _count;
  }
}
