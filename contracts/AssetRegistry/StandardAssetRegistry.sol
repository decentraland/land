pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import '../Storage.sol';

import './IAssetRegistry.sol';

import './IAssetHolder.sol';

contract StandardAssetRegistry is Storage, IAssetRegistry {
  using SafeMath for uint256;

  //
  // Global Getters
  //

  function name() public view returns (string) {
    return _name;
  }

  function symbol() public view returns (string) {
    return _symbol;
  }

  function description() public view returns (string) {
    return _description;
  }

  function totalSupply() public view returns (uint256) {
    return _count;
  }

  //
  // Asset-centric getter functions
  //

  function exists(uint256 assetId) public view returns (bool) {
    return _holderOf[assetId] != 0;
  }

  function holderOf(uint256 assetId) public view returns (address) {
    return _holderOf[assetId];
  }

  function assetData(uint256 assetId) public view returns (string) {
    return _assetData[assetId];
  }

  //
  // Holder-centric getter functions
  //

  function assetsCount(address holder) public view returns (uint256) {
    return _assetsOf[holder].length;
  }

  function assetByIndex(address holder, uint256 index) public view returns (uint256) {
    return _assetsOf[holder][index];
  }

  function allAssetsOf(address holder) public view returns (uint256[]) {
    uint size = _assetsOf[holder].length;
    uint[] memory result = new uint[](size);
    for (uint i = 0; i < size; i++) {
      result[i] = _assetsOf[holder][i];
    }
    return result;
  }

  //
  // Authorization getters
  //

  function isOperatorAuthorizedFor(address operator, address assetHolder)
    public view returns (bool)
  {
    return _operators[assetHolder][operator];
  }

  function authorizeOperator(address operator, bool _authorized) public {
    if (_authorized) {
      require(!isOperatorAuthorizedFor(operator, msg.sender));
      _addAuthorization(operator, msg.sender);
    } else {
      require(isOperatorAuthorizedFor(operator, msg.sender));
      _clearAuthorization(operator, msg.sender);
    }
    AuthorizeOperator(operator, msg.sender, _authorized);
  }

  function _addAuthorization(address operator, address holder) private {
    _operators[holder][operator] = true;
  }

  function _clearAuthorization(address operator, address holder) private {
    _operators[holder][operator] = false;
  }

  //
  // Internal Operations
  //

  function _addAssetTo(address to, uint256 assetId) internal {
    _holderOf[assetId] = to;

    uint256 length = assetsCount(to);

    _assetsOf[to].push(assetId);

    _indexOfAsset[assetId] = length;

    _count = _count.add(1);
  }

  function _addAssetTo(address to, uint256 assetId, string data) internal {
    _addAssetTo(to, assetId);

    _assetData[assetId] = data;
  }

  function _removeAssetFrom(address from, uint256 assetId) internal {
    uint256 assetIndex = _indexOfAsset[assetId];
    uint256 lastAssetIndex = assetsCount(from).sub(1);
    uint256 lastAssetId = _assetsOf[from][lastAssetIndex];

    _holderOf[assetId] = 0;

    // Insert the last asset into the position previously occupied by the asset to be removed
    _assetsOf[from][assetIndex] = lastAssetId;

    // Resize the array
    _assetsOf[from][lastAssetIndex] = 0;
    _assetsOf[from].length--;

    // Remove the array if no more assets are owned to prevent pollution
    if (_assetsOf[from].length == 0) {
      delete _assetsOf[from];
    }

    // Update the index of positions for the asset
    _indexOfAsset[assetId] = 0;
    _indexOfAsset[lastAssetId] = assetIndex;

    _count = _count.sub(1);
  }

  //
  // Supply-altering functions
  //

  function generate(uint256 assetId) public {
    generate(assetId, msg.sender, '');
  }

  function generate(uint256 assetId, string data) public {
    generate(assetId, msg.sender, data);
  }

  function generate(uint256 assetId, address _beneficiary, string data) public {
    doGenerate(assetId, _beneficiary, data);
  }

  function doGenerate(uint256 assetId, address _beneficiary, string data) internal {
    require(_holderOf[assetId] == 0);

    _addAssetTo(_beneficiary, assetId, data);

    Create(_beneficiary, assetId, msg.sender, data);
  }

  function destroy(uint256 assetId) public {
    address holder = _holderOf[assetId];
    require(holder != 0);

    require(holder == msg.sender
         || isOperatorAuthorizedFor(msg.sender, holder));

    _removeAssetFrom(holder, assetId);

    Destroy(holder, assetId, msg.sender);
  }

  //
  // Transaction related operations
  //

  modifier onlyHolder(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender);
    _;
  }

  modifier onlyOperator(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender
         || isOperatorAuthorizedFor(msg.sender, _holderOf[assetId]));
    _;
  }

  function transfer(address to, uint256 assetId)
    onlyHolder(assetId)
    public
  {
    return doSend(to, assetId, '', 0, '');
  }

  function transfer(address to, uint256 assetId, bytes _userData)
    onlyHolder(assetId)
    public
  {
    return doSend(to, assetId, _userData, 0, '');
  }

  function operatorTransfer(
    address to, uint256 assetId, bytes userData, bytes operatorData
  )
    onlyOperator(assetId)
    public
  {
    return doSend(to, assetId, userData, msg.sender, operatorData);
  }

  function doSend(
    address to, uint256 assetId, bytes userData, address operator, bytes operatorData
  )
    internal
  {
    address holder = _holderOf[assetId];
    _removeAssetFrom(holder, assetId);
    _addAssetTo(to, assetId);

    // TODO: Implement EIP 820
    if (isContract(to)) {
      require(_reentrancy == false);
      _reentrancy = true;
      IAssetHolder(to).onAssetReceived(assetId, holder, to, userData, operator, operatorData);
      _reentrancy = false;
    }

    Transfer(holder, to, assetId, operator, userData, operatorData);
  }

  //
  // Update related functions
  //

  modifier onlyIfUpdateAllowed(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender
         || isOperatorAuthorizedFor(msg.sender, _holderOf[assetId]));
    _;
  }

  function update(uint256 assetId, string data) onlyIfUpdateAllowed(assetId) public {
    _assetData[assetId] = data;
    Update(assetId, _holderOf[assetId], msg.sender, data);
  }

  //
  // Utilities
  //

  function isContract(address addr) internal view returns (bool) {
    uint size;
    assembly { size := extcodesize(addr) }
    return size > 0;
  }
}
