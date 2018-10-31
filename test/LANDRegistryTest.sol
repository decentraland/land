pragma solidity ^0.4.18;

import "../contracts/land/LANDRegistry.sol";

contract LANDRegistryTest is LANDRegistry {
  function safeTransferFromToEstate(address from, address to, uint256 assetId, uint256 estateId) external {
    _doTransferFrom(from, to, assetId, toBytes(estateId), true);
  }

  function existsProxy(int x, int y) public view returns (bool) {
    return _exists(_encodeTokenId(x, y));
  }

  function isDeploymentAuthorized(address beneficiary) public view returns (bool) {
    return authorizedDeploy[beneficiary];
  }
}
