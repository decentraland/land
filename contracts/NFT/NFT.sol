pragma solidity ^0.4.18;

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
  event Transfer(uint tokenId, address from, address to);
  event Approve(address owner, address beneficiary, uint tokenId);

  event MetadataUpdate(uint tokenId, address owner, string data);
}
