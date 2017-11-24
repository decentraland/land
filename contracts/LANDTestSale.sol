pragma solidity ^0.4.15;

import './LANDToken.sol';

contract LANDTestSale {

  LANDToken public land;

  function LANDTestSale(address _land) {
    land = LANDToken(_land);
  }

  function buy(uint256 _x, uint256 _y, string _data) public {
    uint token = land.buildTokenId(_x, _y);
    if (land.exists(token)) {
      land._transfer(land.ownerOf(token), msg.sender, token);
    } else {
      land.assignNewParcel(msg.sender, token, _data);
    }
  }

  function claimForgottenParcel(address beneficiary, uint tokenId) public {
    land.claimForgottenParcel(beneficiary, tokenId);
  }
}
