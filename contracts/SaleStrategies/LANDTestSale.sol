pragma solidity ^0.4.18;

import '../LANDRegistry.sol';

contract LANDTestSale is LANDRegistry {

  function LANDTestSale() public {
    owner = this;
  }

  function buy(uint256 _x, uint256 _y, string _data) public {
    uint token = buildTokenId(_x, _y);
    if (ownerOf(token) != 0) {
      _assignNewParcel(msg.sender, token, _data);
    }
  }
}
