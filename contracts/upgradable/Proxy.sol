pragma solidity ^0.4.18;

import "../Storage.sol";
import "./Ownable.sol";
import "./DelegateProxy.sol";
import "./IApplication.sol";

contract Proxy is Storage, DelegateProxy {

  event Upgrade(address indexed newContract, bytes initializedWith);
  event OwnerUpdate(address _prevOwner, address _newOwner);

  function Proxy() public {
    proxyOwner = msg.sender;
  }

  modifier onlyProxyOwner() {
    require(msg.sender == proxyOwner);
    _;
  }

  function transferOwnership(address _newOwner) public onlyProxyOwner {
    require(_newOwner != owner);

    OwnerUpdate(owner, _newOwner);
    proxyOwner = _newOwner;
  }

  function upgrade(IApplication newContract, bytes data) public onlyProxyOwner {
    currentContract = newContract;
    newContract.initialize(data);

    Upgrade(newContract, data);
  }

  function () payable public {
    require(currentContract != 0); // if app code hasn't been set yet, don't call
    delegatedFwd(currentContract, msg.data);
  }
}
