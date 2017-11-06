pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './BasicNFT.sol';

contract LANDToken is Ownable, BasicNFT {

  string public name = 'Decentraland World';
  string public symbol = 'LAND';

  mapping (uint => uint) public latestPing;

  event TokenPing(uint tokenId);

  function assignNewParcel(address beneficiary, uint tokenId, string _metadata) onlyOwner public {
    require(tokenOwner[tokenId] == 0);

    latestPing[tokenId] = now;
    _addTokenTo(beneficiary, tokenId);
    totalTokens++;
    tokenMetadata[tokenId] = _metadata;

    TokenCreated(tokenId, beneficiary, _metadata);
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
    return ownerOfLand(x, y) != 0;
  }

  function ownerOfLand(uint x, uint y) public constant returns (address) {
    return tokenOwner[buildTokenId(x, y)];
  }

  function transferLand(address to, uint x, uint y) public {
    return transfer(to, buildTokenId(x, y));
  }

  function approveLandTransfer(address to, uint x, uint y) public {
    return approve(to, buildTokenId(x, y));
  }

  function transferLandFrom(address from, address to, uint x, uint y) public {
    return transferFrom(from, to, buildTokenId(x, y));
  }

  function landMetadata(uint x, uint y) constant public returns (string) {
    return tokenMetadata[buildTokenId(x, y)];
  }

  function updateLandMetadata(uint x, uint y, string _metadata) public {
    return updateTokenMetadata(buildTokenId(x, y), _metadata);
  }

  function claimForgottenParcel(address beneficiary, uint tokenId) onlyOwner public {
    require(tokenOwner[tokenId] != 0);
    require(latestPing[tokenId] < now);
    require(now - latestPing[tokenId] > 1 years);

    address oldOwner = tokenOwner[tokenId];
    latestPing[tokenId] = now;
    _transfer(oldOwner, beneficiary, tokenId);

    TokenTransferred(tokenId, oldOwner, beneficiary);
  }
}
