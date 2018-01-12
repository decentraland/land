pragma solidity ^0.4.18;

import "./ProxyStorage.sol";

import "./DelegateProxy.sol";

import "./IApplication.sol";

contract Proxy is ProxyStorage, DelegateProxy {

  event Upgrade(address indexed newContract, bytes initializedWith);

  function upgrade(IApplication newContract, bytes data) public {
    currentContract = newContract;
    newContract.initialize(data);

    Upgrade(newContract, data);
  }

  function () payable public {
    require(currentContract != 0); // if app code hasn't been set yet, don't call
    delegatedFwd(currentContract, msg.data);
  }
}
