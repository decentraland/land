pragma solidity ^0.4.18;

import './OwnableStorage.sol';

import './IApplication.sol';

contract Ownable is OwnableStorage, IApplication {

  event OwnerUpdate(address _prevOwner, address _newOwner);

  modifier onlyOwner {
    assert(msg.sender == owner);
    _;
  }

  function transferOwnership(address _newOwner) public onlyOwner {
    require(_newOwner != owner);
    owner = _newOwner;
  }
}
