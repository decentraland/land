pragma solidity ^0.4.18;

import './IApplication.sol';

contract Ownable is IApplication {
  address public owner;
  address public newOwner;

  event OwnerUpdate(address _prevOwner, address _newOwner);

  function initialize(bytes data) public {
    owner = msg.sender;
  }

  modifier onlyOwner {
    assert(msg.sender == owner);
    _;
  }

  function transferOwnership(address _newOwner) public onlyOwner {
    require(_newOwner != owner);
    newOwner = _newOwner;
  }

  function acceptOwnership() public {
    require(msg.sender == newOwner);
    OwnerUpdate(owner, newOwner);
    owner = newOwner;
    newOwner = 0x0;
  }
}
