pragma solidity ^0.4.18;

import "./DelegateProxy.sol";
import "./Ownable.sol";
import "./IApplication.sol";

contract Proxy is Ownable, DelegateProxy {
  /**
   * Current contract to which we are proxing
   */
  address currentContract;

  function upgrade(IApplication newContract, bytes data) onlyOwner public {
    currentContract = newContract;
    newContract.initialize(data);
  }

  function () payable public {
    require(currentContract != 0); // if app code hasn't been set yet, don't call
    delegatedFwd(currentContract, msg.data);
  }
}
