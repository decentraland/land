pragma solidity ^0.4.15;

contract NFT {
  function totalSupply() constant returns (uint);
  function balanceOf(address) constant returns (uint);

  function tokenByIndex(address owner, uint index) returns (uint);
  function ownerOf(uint tokenId) returns (address);

  function transfer(address to, uint tokenId);
  function approve(address beneficiary, uint tokenId);

  function transferFrom(address from, address to, uint tokenId);

  function metadata(uint tokenId) constant returns (bytes);
}

contract NFTEvents {
  event TokenCreated(uint tokenId, address owner, bytes metadata);
  event TokenDestroyed(uint tokenId, address owner);

  event TokenTransferred(uint tokenId, address from, address to);
  event TokenTransferAllowed(uint tokenId, address beneficiary);
  event TokenTransferDisallowed(uint tokenId, address beneficiary);

  event TokenMetadataUpdated(uint tokenId, address owner, bytes data);
}
