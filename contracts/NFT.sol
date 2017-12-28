pragma solidity ^0.4.15;

contract NFT {
  function totalSupply() public constant returns (uint);
  function balanceOf(address) public constant returns (uint);

  function tokenOfOwnerByIndex(address owner, uint index) public constant returns (uint);
  function ownerOf(uint tokenId) public constant returns (address);

  function transfer(address to, uint tokenId) public;
  function takeOwnership(uint tokenId) public;
  function transferFrom(address from, address to, uint tokenId) public;
  function approve(address beneficiary, uint tokenId) public;

  function metadata(uint tokenId) public constant returns (string);
}

contract NFTEvents {
  event Created(uint tokenId, address owner, string metadata);
  event Destroyed(uint tokenId, address owner);

  event Transferred(uint tokenId, address from, address to);
  event Approval(address owner, address beneficiary, uint tokenId);

  event MetadataUpdated(uint tokenId, address owner, string data);
}
