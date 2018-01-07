pragma solidity ^0.4.18;

import './ILANDRegistry';

contract LANDRegistry is Ownable, IApplication, ILANDRegistry, LANDStorage,
  AssignableLAND, ClearableLAND, LANDAccessors, TransferableLAND, UpdatableLAND
{
  function initialize(bytes data) public {
    initialize();
  }

  function initialize() public {
    owner = msg.sender;
    _name = 'Decentraland Land';
    _symbol = 'LAND';
    _description = 'Contract that stores the Decentraland LAND registry';
  }
}
