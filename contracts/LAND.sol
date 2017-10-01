pragma solidity ^0.4.15;

contract Land is BasicNFT {
  name = 'Decentraland World';
  symbol = 'LAND';
  
  address claimContract;
  mapping (uint => uint) latestPing;
  
  event TokenPing(uint tokenId);
  
  Land(address _claimContract) {
    claimContract = _claimContract;
  }
  
  assignNewParcel(address beneficiary, uint tokenId, bytes metadata) {
    require(msg.sender == claimContract);
    require(!tokenOwner[tokenId]);
    latestPing[tokenId] = now;
    _addTokenTo(beneficiary, tokenId);
    TokenCreated(tokenId, beneficiary, metadata);
  }
  
  ping(uint tokenId) {
    require(msg.sender == tokenOwner[tokenId]);
    latestPing[tokenId] = now;
    TokenPing(tokenId);
  }
  
  claimForgottenParcel(address beneficiary, uint tokenId) {
    require(tokenOwner[tokenId] != 0);
    require(latestPing[tokenId] < now);
    require(now - latestPing[tokenId] > 1 year);
    _transfer(tokenOwner[tokenId], beneficiary, tokenId);
    TokenTransferred(tokenId, from, to);
  }
}
