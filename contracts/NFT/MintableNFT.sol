pragma solidity ^0.4.18;

import './BasicNFT.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract MintableNFT is BasicNFT, Ownable {
  function mint(address _owner, uint _tokenId) onlyOwner public {
    require(_owner != 0);
    require(ownerOf(_tokenId) == 0);

    _addTokenTo(_owner, _tokenId);
    totalTokens++;
    Transfer(_tokenId, 0, _owner);
  }
}
