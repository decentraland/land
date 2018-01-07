pragma solidity ^0.4.18;

import '../contracts/NFT/MintableNFT.sol';

contract NonFungibleTokenTest is MintableNFT {
  function NonFungibleTokenTest(string _name, string _symbol) {
    name = _name;
    symbol = _symbol;
  }

  function tokensOf(address _owner) constant returns (uint[]) {
    return getAllTokens(_owner);
  }
}
