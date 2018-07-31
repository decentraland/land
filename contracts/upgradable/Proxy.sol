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
  // Dispatch fallback
  //

  function () public payable {
    require(currentContract != 0, "If app code has not been set yet, do not call");
    delegatedFwd(currentContract, msg.data);
  }

  //
  // Ownership
  //

  modifier onlyProxyOwner() {
    require(msg.sender == proxyOwner, "Unauthorized user");
    _;
  }

  function transferOwnership(address _newOwner) public onlyProxyOwner {
    require(_newOwner != address(0), "Empty address");
    require(_newOwner != proxyOwner, "Already authorized");
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
}
