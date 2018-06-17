pragma solidity ^0.4.23;

import '../estate/IEstateFactory.sol';

contract LANDStorage {

    mapping (address => uint) public latestPing;
  
    uint256 constant clearLow = 0xffffffffffffffffffffffffffffffff00000000000000000000000000000000;
    uint256 constant clearHigh = 0x00000000000000000000000000000000ffffffffffffffffffffffffffffffff;
    uint256 constant factor = 0x100000000000000000000000000000000;
  
    mapping (address => bool) public authorizedDeploy;
  
    mapping (uint256 => address) public updateOperator;
  
    IEstateFactory public estateFactory;
}
