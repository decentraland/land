pragma solidity ^0.4.18;

import "../Storage.sol";

import "./Ownable.sol";

import "./DelegateProxy.sol";

import "./IApplication.sol";

contract Proxy is Storage, Ownable, DelegateProxy {

  event Upgrade(address indexed newContract, bytes initializedWith);

  function initialize(bytes) onlyOwner public {
    // Prevent calls to initialize
    throw;
  }

  function upgrade(IApplication newContract, bytes data) onlyOwner public {
    currentContract = newContract;
    newContract.initialize(data);

    Upgrade(newContract, data);
  }

  function () payable public {
    require(currentContract != 0); // if app code hasn't been set yet, don't call
    delegatedFwd(currentContract, msg.data);
  }
}
