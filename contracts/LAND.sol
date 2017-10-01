pragma solidity ^0.4.15;

contract Land is BasicNFT {
  name = 'Decentraland World';
  symbol = 'LAND';
  
  address claimContract;
  mapping (uint => uint) latestPing;
  
  Land(address _claimContract) {
    claimContract = _claimContract;
  }
  
  assignNewParcel(address beneficiary, uint tokenId) {
    require(msg.sender == claimContract);
    require(!tokenOwner[tokenId]);
    latestPing[tokenId] = now;
    _addTokenTo(beneficiary, tokenId);
  }
  
  ping(uint tokenId) {
    require(msg.sender == tokenOwner[tokenId]);
    latestPing[tokenId] = now;
  }
  
  claimForgottenParcel(address beneficiary, uint tokenId) {
    require(now - latestPing[tokenId] > 1 year);
    _transfer(tokenOwner[tokenId], beneficiary, tokenId);
  }
}
