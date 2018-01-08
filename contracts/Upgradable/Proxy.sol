pragma solidity ^0.4.18;

import "./DelegateProxy.sol";
import "./Ownable.sol";
import "./IApplication.sol";

contract Proxy is Ownable, DelegateProxy {
  /**
   * Current contract to which we are proxing
   */
  address currentContract;

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
