pragma solidity ^0.4.18;


contract ProxyStorage {

  /**
   * Current contract to which we are proxing
   */
  address public currentContract;
  address public proxyOwner;
}
