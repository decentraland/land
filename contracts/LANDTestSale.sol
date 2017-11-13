pragma solidity ^0.4.15;

import './LANDToken.sol';

contract LANDTestSale {

  LANDToken public land;

  function LANDTestSale(address _land) {
    land = LANDToken(_land);
  }

  function buy(uint256 _x, uint256 _y, string _data) public {
    land.assignNewParcel(msg.sender, land.buildTokenId(_x, _y), _data);
  }

  function claimForgottenParcel(address beneficiary, uint tokenId) public {
    land.claimForgottenParcel(beneficiary, tokenId);
  }
}
