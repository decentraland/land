pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './NFT/BasicNFT.sol';

contract LANDRegistry is Ownable, AssetRegistry {


  function assignNewParcel(address beneficiary, uint tokenId, string _metadata) onlyOwner public {
    require(tokenOwner[tokenId] == 0);
    _assignNewParcel(beneficiary, tokenId, _metadata);
  }

  function _assignNewParcel(address beneficiary, uint tokenId, string _metadata) internal {
    latestPing[tokenId] = now;
    _addTokenTo(beneficiary, tokenId);
    totalTokens++;
    _tokenMetadata[tokenId] = _metadata;

    Transfer(tokenId, 0, beneficiary);
  }

  function ping(uint tokenId) public {
    require(msg.sender == tokenOwner[tokenId]);

    latestPing[tokenId] = now;

    Ping(tokenId);
  }

  uint256 constant clearLow = 0xffffffffffffffff0000000000000000;
  uint256 constant clearHigh = 0x0000000000000000ffffffffffffffff;

  function buildTokenId(uint x, uint y) public returns (uint256) {
    return ((x << 128) & clearLow) | (y & clearHigh);
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

    Transfer(tokenId, oldOwner, beneficiary);
  }
}
