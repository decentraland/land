pragma solidity ^0.4.18;

import "../Storage.sol";
import "./Ownable.sol";
import "./DelegateProxy.sol";
import "./IApplication.sol";

contract Proxy is Storage, DelegateProxy, Ownable {

  event Upgrade(address indexed newContract, bytes initializedWith);
  event OwnerUpdate(address _prevOwner, address _newOwner);

  constructor() public {
    proxyOwner = msg.sender;
    owner = msg.sender;
  }

  //
  // Ownership
  //

  modifier onlyProxyOwner() {
    require(msg.sender == proxyOwner);
    _;
  }

  function transferOwnership(address _newOwner) public onlyProxyOwner {
    require(_newOwner != address(0));
    require(_newOwner != proxyOwner);
    proxyOwner = _newOwner;
  }

  //
  // Upgrade
  //

  function upgrade(IApplication newContract, bytes data) public onlyProxyOwner {
    currentContract = newContract;
    IApplication(this).initialize(data);

    emit Upgrade(newContract, data);
  }

  //
  // Dispatch fallback
  //

  function () payable public {
    require(currentContract != 0); // if app code hasn't been set yet, don't call
    delegatedFwd(currentContract, msg.data);
  }
}
