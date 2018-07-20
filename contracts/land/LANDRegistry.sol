pragma solidity ^0.4.23;

import "../Storage.sol";

import "../upgradable/Ownable.sol";

import "../upgradable/IApplication.sol";

import "erc821/contracts/FullAssetRegistry.sol";

import "./ILANDRegistry.sol";

import "../metadata/IMetadataHolder.sol";

import "../estate/IEstateRegistry.sol";


/* solium-disable function-order */
contract LANDRegistry is Storage, Ownable, FullAssetRegistry, ILANDRegistry {
  bytes4 constant public GET_METADATA = bytes4(keccak256("getMetadata(uint256)"));

  function initialize(bytes) external {
    _name = "Decentraland LAND";
    _symbol = "LAND";
    _description = "Contract that stores the Decentraland LAND registry";
  }

  modifier onlyProxyOwner() {
    require(msg.sender == proxyOwner, "this function can only be called by the proxy owner");
    _;
  }

  //
  // LAND Create and destroy
  //

  modifier onlyOwnerOf(uint256 assetId) {
    require(msg.sender == _ownerOf(assetId), "this function can only be called by the owner of the asset");
    _;
  }

  modifier onlyUpdateAuthorized(uint256 tokenId) {
    require(msg.sender == _ownerOf(tokenId) || _isUpdateAuthorized(msg.sender, tokenId), "msg.sender is not authorized to update");
    _;
  }

  function isUpdateAuthorized(address operator, uint256 assetId) external view returns (bool) {
    return _isUpdateAuthorized(operator, assetId);
  }

  function _isUpdateAuthorized(address operator, uint256 assetId) internal view returns (bool) {
    return operator == _ownerOf(assetId) || updateOperator[assetId] == operator;
  }

  function authorizeDeploy(address beneficiary) external onlyProxyOwner {
    authorizedDeploy[beneficiary] = true;
  }

  function forbidDeploy(address beneficiary) external onlyProxyOwner {
    authorizedDeploy[beneficiary] = false;
  }

  function assignNewParcel(int x, int y, address beneficiary) external onlyProxyOwner {
    _generate(_encodeTokenId(x, y), beneficiary);
  }

  function assignMultipleParcels(int[] x, int[] y, address beneficiary) external onlyProxyOwner {
    for (uint i = 0; i < x.length; i++) {
      _generate(_encodeTokenId(x[i], y[i]), beneficiary);
    }
  }

  //
  // Inactive keys after 1 year lose ownership
  //

  function ping() external {
    // solium-disable-next-line security/no-block-members
    latestPing[msg.sender] = block.timestamp;
  }

  function setLatestToNow(address user) external {
    require(msg.sender == proxyOwner || _isApprovedForAll(msg.sender, user));
    // solium-disable-next-line security/no-block-members
    latestPing[user] = block.timestamp;
  }

  //
  // LAND Getters
  //

  function encodeTokenId(int x, int y) pure external returns (uint) {
    return _encodeTokenId(x, y);
  }

  function _encodeTokenId(int x, int y) pure internal returns (uint result) {
    require(-1000000 < x && x < 1000000 && -1000000 < y && y < 1000000);
    return _unsafeEncodeTokenId(x, y);
  }

  function _unsafeEncodeTokenId(int x, int y) pure internal returns (uint) {
    return ((uint(x) * factor) & clearLow) | (uint(y) & clearHigh);
  }

  function decodeTokenId(uint value) pure external returns (int, int) {
    return _decodeTokenId(value);
  }

  function _unsafeDecodeTokenId(uint value) pure internal returns (int x, int y) {
    x = expandNegative128BitCast((value & clearLow) >> 128);
    y = expandNegative128BitCast(value & clearHigh);
  }

  function _decodeTokenId(uint value) pure internal returns (int x, int y) {
    (x, y) = _unsafeDecodeTokenId(value);
    require(-1000000 < x && x < 1000000 && -1000000 < y && y < 1000000);
  }

  function expandNegative128BitCast(uint value) pure internal returns (int) {
    if (value & (1<<127) != 0) {
      return int(value | clearLow);
    }
    return int(value);
  }

  function exists(int x, int y) view external returns (bool) {
    return _exists(x, y);
  }

  function _exists(int x, int y) view internal returns (bool) {
    return _exists(_encodeTokenId(x, y));
  }

  function ownerOfLand(int x, int y) view external returns (address) {
    return _ownerOfLand(x, y);
  }

  function _ownerOfLand(int x, int y) view internal returns (address) {
    return _ownerOf(_encodeTokenId(x, y));
  }

  function ownerOfLandMany(int[] x, int[] y) view external returns (address[]) {
    require(x.length > 0);
    require(x.length == y.length);

    address[] memory addrs = new address[](x.length);
    for (uint i = 0; i < x.length; i++) {
      addrs[i] = _ownerOfLand(x[i], y[i]);
    }

    return addrs;
  }

  function landOf(address owner) external view returns (int[], int[]) {
    uint256 len = _assetsOf[owner].length;
    int[] memory x = new int[](len);
    int[] memory y = new int[](len);

    int assetX;
    int assetY;
    for (uint i = 0; i < len; i++) {
      (assetX, assetY) = _decodeTokenId(_assetsOf[owner][i]);
      x[i] = assetX;
      y[i] = assetY;
    }

    return (x, y);
  }

  function tokenMetadata(uint256 assetId) external view returns (string) {
    return _tokenMetadata(assetId);
  }

  function _tokenMetadata(uint256 assetId) internal view returns (string) {
    address _owner = _ownerOf(assetId);
    if (_isContract(_owner)) {
      if ((ERC165(_owner)).supportsInterface(GET_METADATA)) {
        return IMetadataHolder(_owner).getMetadata(assetId);
      }
    }
    return _assetData[assetId];
  }

  function landData(int x, int y) external view returns (string) {
    return _tokenMetadata(_encodeTokenId(x, y));
  }

  //
  // LAND Transfer
  //

  function transferLand(int x, int y, address to) external {
    uint256 tokenId = _encodeTokenId(x, y);
    _doTransferFrom(
      _ownerOf(tokenId),
      to,
      tokenId,
      "",
      msg.sender,
      true
    );
  }

  function transferManyLand(int[] x, int[] y, address to) external {
    require(x.length > 0);
    require(x.length == y.length);

    for (uint i = 0; i < x.length; i++) {
      uint256 tokenId = _encodeTokenId(x[i], y[i]);
      _doTransferFrom(
        _ownerOf(tokenId),
        to,
        tokenId,
        "",
        msg.sender,
        true
      );
    }
  }

  function setUpdateOperator(uint256 assetId, address operator) external onlyOwnerOf(assetId) {
    updateOperator[assetId] = operator;
    emit UpdateOperator(assetId, operator);
  }

  //
  // Estate generation
  //

  event EstateRegistrySet(address indexed registry);

  function setEstateRegistry(address registry) onlyProxyOwner external {
    estateRegistry = IEstateRegistry(registry);
    emit EstateRegistrySet(registry);
  }

  function createEstate(
    int[] x,
    int[] y,
    address beneficiary
  )
    external
    returns (uint256)
  {
    require(x.length == y.length);
    require(x.length > 0);
    require(address(estateRegistry) != 0);

    uint256 estateTokenId = estateRegistry.mint(beneficiary);
    bytes memory estateTokenIdBytes = toBytes(estateTokenId);

    for (uint i = 0; i < x.length; i++) {
      uint256 tokenId = _encodeTokenId(x[i], y[i]);
      _moveToken(
        _ownerOf(tokenId),
        address(estateRegistry),
        tokenId,
        estateTokenIdBytes,
        this,
        true
      );
    }

    return estateTokenId;
  }

  function toBytes(uint256 x) internal pure returns (bytes b) {
    b = new bytes(32);
    // solium-disable-next-line security/no-inline-assembly
    assembly { mstore(add(b, 32), x) }
  }

  //
  // LAND Update
  //

  function updateLandData(int x, int y, string data) external onlyUpdateAuthorized (_encodeTokenId(x, y)) {
    return _updateLandData(x, y, data);
  }

  function _updateLandData(int x, int y, string data) internal onlyUpdateAuthorized (_encodeTokenId(x, y)) {
    uint256 assetId = _encodeTokenId(x, y);
    address owner = _holderOf[assetId];

    if (owner == address(estateRegistry)) {
      uint256 estateId = estateRegistry.getTokenEstateId(assetId);
      estateRegistry.updateMetadata(estateId, data);
    } else {
      _update(assetId, data);
    }

    emit Update(
      assetId,
      owner,
      msg.sender,
      data
    );
  }

  function updateManyLandData(int[] x, int[] y, string data) external {
    require(x.length > 0);
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      _updateLandData(x[i], y[i], data);
    }
  }

  function _doTransferFrom(
    address from,
    address to,
    uint256 assetId,
    bytes userData,
    address operator,
    bool doCheck
  )
    internal
  {
    updateOperator[assetId] = address(0);

    super._doTransferFrom(
      from,
      to,
      assetId,
      userData,
      operator,
      doCheck
    );
  }

  function _isContract(address addr) internal view returns (bool) {
    uint size;
    // solium-disable-next-line security/no-inline-assembly
    assembly { size := extcodesize(addr) }
    return size > 0;
  }
}
