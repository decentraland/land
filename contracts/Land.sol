pragma solidity ^0.4.15;

import './BasicNFT.sol';

contract Land is BasicNFT {

  string public name = 'Decentraland World';
  string public symbol = 'LAND';

  address public claimContract;
  mapping (uint => uint) public latestPing;

  event TokenPing(uint tokenId);

  function Land(address _claimContract) {
    claimContract = _claimContract;
  }

  function assignNewParcel(address beneficiary, uint tokenId, string metadata) public {
    require(msg.sender == claimContract);
    require(tokenOwner[tokenId] == 0);
    latestPing[tokenId] = now;
    _addTokenTo(beneficiary, tokenId);
    totalTokens++;
    TokenCreated(tokenId, beneficiary, metadata);
  }

  function ping(uint tokenId) public {
    require(msg.sender == tokenOwner[tokenId]);
    latestPing[tokenId] = now;
    TokenPing(tokenId);
  }

  function buildTokenId(uint x, uint y) public constant returns (uint256) {
    return uint256(sha3(x, '|', y));
  }

  function exists(uint x, uint y) public constant returns (bool) {
    return tokenOwner[buildTokenId(x, y)] != 0;
  }

  function claimForgottenParcel(address beneficiary, uint tokenId) public {
    require(msg.sender == claimContract);
    require(tokenOwner[tokenId] != 0);
    require(latestPing[tokenId] < now);
    require(now - latestPing[tokenId] > 1 years);
    address oldOwner = tokenOwner[tokenId];
    latestPing[tokenId] = now;
    _transfer(oldOwner, beneficiary, tokenId);
    TokenTransferred(tokenId, oldOwner, beneficiary);
  }
}
