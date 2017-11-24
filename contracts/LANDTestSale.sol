pragma solidity ^0.4.15;

import './LANDToken.sol';

contract LANDTestSale is LANDToken {

  function LANDTestSale() {
    owner = this;
  }

  function buy(uint256 _x, uint256 _y, string _data) public {
    uint token = buildTokenId(_x, _y);
    if (ownerOf(token) != 0) {
      _transfer(ownerOf(token), msg.sender, token);
      tokenMetadata[token] = _data;
    } else {
      assignNewParcel(msg.sender, token, _data);
    }
  }
}
