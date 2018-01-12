pragma solidity ^0.4.18;

contract OwnableStorage {

  address public owner;

  function OwnableStorage() internal {
    owner = msg.sender;
  }

}
