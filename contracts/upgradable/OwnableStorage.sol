pragma solidity ^0.4.23;


contract OwnableStorage {

  address public owner;

  constructor() internal {
    owner = msg.sender;
  }

}
