pragma solidity ^0.4.18;

import '../contracts/land/LANDRegistry.sol';

contract LANDRegistryTest is LANDRegistry {
  function safeTransferFromFull(address from, address to, uint256 assetId, bytes userData) external {
    _doTransferFrom(from, to, assetId, userData, msg.sender, true);
  }

  function existsProxy(int x, int y) view public returns (bool) {
    return _exists(_encodeTokenId(x, y));
  }

  function isDeploymentAuthorized(address beneficiary) view public returns (bool) {
    return authorizedDeploy[beneficiary];
  }
}
