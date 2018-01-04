pragma solidity ^0.4.18;

import '../LANDToken.sol';

contract LANDTestSale is LANDToken {

  function LANDTestSale() public {
    owner = this;
  }

  function buy(uint256 _x, uint256 _y, string _data) public {
    uint token = buildTokenId(_x, _y);
    if (ownerOf(token) != 0) {
      _transfer(ownerOf(token), msg.sender, token);
      _tokenMetadata[token] = _data;
    } else {
      _assignNewParcel(msg.sender, token, _data);
    }
  }
}
