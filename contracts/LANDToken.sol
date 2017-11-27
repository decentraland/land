pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './BasicNFT.sol';

contract LANDToken is Ownable, BasicNFT {

  string public name = 'Decentraland World';
  string public symbol = 'LAND';

  mapping (uint => uint) public latestPing;

  event Ping(uint tokenId);

  function assignNewParcel(address beneficiary, uint tokenId, string _metadata) onlyOwner public {
    require(tokenOwner[tokenId] == 0);
    _assignNewParcel(beneficiary, tokenId, _metadata);
  }

  function _assignNewParcel(address beneficiary, uint tokenId, string _metadata) internal {
    latestPing[tokenId] = now;
    _addTokenTo(beneficiary, tokenId);
    totalTokens++;
    _tokenMetadata[tokenId] = _metadata;

    Created(tokenId, beneficiary, _metadata);
  }

  function ping(uint tokenId) public {
    require(msg.sender == tokenOwner[tokenId]);

    latestPing[tokenId] = now;

    Ping(tokenId);
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

  function takeLand(uint x, uint y) public {
    return takeOwnership(buildTokenId(x, y));
  }

  function approveLandTransfer(address to, uint x, uint y) public {
    return approve(to, buildTokenId(x, y));
  }

  function landMetadata(uint x, uint y) constant public returns (string) {
    return _tokenMetadata[buildTokenId(x, y)];
  }

  function updateLandMetadata(uint x, uint y, string _metadata) public {
    return updateTokenMetadata(buildTokenId(x, y), _metadata);
  }

  function updateManyLandMetadata(uint[] x, uint[] y, string _metadata) public {
    for (uint i = 0; i < x.length; i++) {
      updateTokenMetadata(buildTokenId(x[i], y[i]), _metadata);
    }
  }

  function claimForgottenParcel(address beneficiary, uint tokenId) onlyOwner public {
    require(tokenOwner[tokenId] != 0);
    require(latestPing[tokenId] < now);
    require(now - latestPing[tokenId] > 1 years);

    address oldOwner = tokenOwner[tokenId];
    latestPing[tokenId] = now;
    _transfer(oldOwner, beneficiary, tokenId);

    Transferred(tokenId, oldOwner, beneficiary);
  }
}
