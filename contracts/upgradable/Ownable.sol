pragma solidity ^0.4.18;

import '../Storage.sol';

contract Ownable is Storage {

  event OwnerUpdate(address _prevOwner, address _newOwner);

  function bytesToAddress (bytes b) pure public returns (address) {
    uint result = 0;
    for (uint i = b.length-1; i+1 > 0; i--) {
      uint c = uint(b[i]);
      uint to_inc = c * ( 16 ** ((b.length - i-1) * 2));
      result += to_inc;
    }
    return address(result);
  }

  modifier onlyOwner {
    assert(msg.sender == owner);
    _;
  }

  function initialize(bytes data) public {
    owner = bytesToAddress(data);
  }

  function transferOwnership(address _newOwner) public onlyOwner {
    require(_newOwner != owner);
    owner = _newOwner;
  }
}
