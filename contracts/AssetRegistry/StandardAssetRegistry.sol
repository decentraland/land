pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import '../Storage.sol';

import './IAssetRegistry.sol';

contract StandardAssetRegistry is Storage, IAssetRegistry {
  using SafeMath for uint256;

  //
  // Global Getters
  //

  function name() public constant returns (string) {
    return _name;
  }
  function symbol() public constant returns (string) {
    return _symbol;
  }
  function description() public constant returns (string) {
    return _description;
  }
  function totalSupply() public constant returns (uint256) {
    return _count;
  }

  //
  // Asset-centric getter functions
  //

  function exists(uint256 _assetId) public constant returns (bool) {
    return _holderOf[_assetId] != 0;
  }
  function holderOf(uint256 _assetId) public constant returns (address) {
    return _holderOf[_assetId];
  }
  function assetData(uint256 _assetId) public constant returns (string) {
    return _assetData[_assetId];
  }

  //
  // Holder-centric getter functions
  //

  function assetsCount(address _holder) public constant returns (uint256) {
    return _assetsOf[_holder].length;
  }

  function assetByIndex(address _holder, uint256 _index) public constant returns (uint256) {
    return _assetsOf[_holder][_index];
  }

  function allAssetsOf(address _holder) public constant returns (uint256[]) {
    uint size = _assetsOf[_holder].length;
    uint[] memory result = new uint[](size);
    for (uint i = 0; i < size; i++) {
      result[i] = _assetsOf[_holder][i];
    }
    return result;
  }

  //
  // Authorization getters
  //

  function isOperatorAuthorizedFor(address _operator, address _assetHolder)
    public constant returns (bool)
  {
    return _operators[_assetHolder][_operator];
  }

  function authorizeOperator(address _operator, bool _authorized) public {
    if (_authorized) {
      require(!isOperatorAuthorizedFor(_operator, msg.sender));
      _addAuthorization(_operator, msg.sender);
    } else {
      require(isOperatorAuthorizedFor(_operator, msg.sender));
      _clearAuthorization(_operator, msg.sender);
    }
    AuthorizeOperator(_operator, msg.sender, _authorized);
  }

  function _addAuthorization(address _operator, address _holder) private {
    _operators[_holder][_operator] = true;
  }

  function _clearAuthorization(address _operator, address _holder) private {
    _operators[_holder][_operator] = false;
  }

  //
  // Internal Operations
  //

  function _addAssetTo(address _to, uint256 _assetId) internal {
    _holderOf[_assetId] = _to;

    uint256 length = assetsCount(_to);

    _assetsOf[_to].push(_assetId);

    _indexOfAsset[_assetId] = length;

    _count = _count.add(1);
  }

  function _addAssetTo(address _to, uint256 _assetId, string _data) internal {
    _addAssetTo(_to, _assetId);

    _assetData[_assetId] = _data;
  }

  function _removeAssetFrom(address _from, uint256 _assetId) internal {
    uint256 assetIndex = _indexOfAsset[_assetId];
    uint256 lastAssetIndex = assetsCount(_from).sub(1);
    uint256 lastAssetId = _assetsOf[_from][lastAssetIndex];

    _holderOf[_assetId] = 0;

    // Insert the last asset into the position previously occupied by the asset to be removed
    _assetsOf[_from][assetIndex] = lastAssetId;

    // Resize the array
    _assetsOf[_from][lastAssetIndex] = 0;
    _assetsOf[_from].length--;

    // Remove the array if no more assets are owned to prevent pollution
    if (_assetsOf[_from].length == 0) {
      delete _assetsOf[_from];
    }

    // Update the index of positions for the asset
    _indexOfAsset[_assetId] = 0;
    _indexOfAsset[lastAssetId] = assetIndex;

    _count = _count.sub(1);
  }

  //
  // Supply-altering functions
  //

  function create(uint256 _assetId) public {
    create(_assetId, msg.sender, '');
  }

  function create(uint256 _assetId, string _data) public {
    create(_assetId, msg.sender, _data);
  }

  function create(uint256 _assetId, address _beneficiary, string _data) public {
    doCreate(_assetId, _beneficiary, _data);
  }

  function doCreate(uint256 _assetId, address _beneficiary, string _data) internal {
    require(_holderOf[_assetId] == 0);

    _addAssetTo(_beneficiary, _assetId, _data);

    Create(_beneficiary, _assetId, msg.sender, _data);
  }

  function destroy(uint256 _assetId) public {
    address holder = _holderOf[_assetId];
    require(holder != 0);

    require(holder == msg.sender
         || isOperatorAuthorizedFor(msg.sender, holder));

    _removeAssetFrom(holder, _assetId);

    Destroy(holder, _assetId, msg.sender);
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

  function transfer(address _to, uint256 _assetId)
    onlyHolder(_assetId)
    public
  {
    return doSend(_to, _assetId, '', 0, '');
  }

  function transfer(address _to, uint256 _assetId, bytes _userData)
    onlyHolder(_assetId)
    public
  {
    return doSend(_to, _assetId, _userData, 0, '');
  }

  function operatorTransfer(
    address _to, uint256 _assetId, bytes userData, bytes operatorData
  )
    onlyOperator(_assetId)
    public
  {
    return doSend(_to, _assetId, userData, msg.sender, operatorData);
  }

  function doSend(
    address _to, uint256 assetId, bytes userData, address operator, bytes operatorData
  )
    internal
  {
    address holder = _holderOf[assetId];
    _removeAssetFrom(holder, assetId);
    _addAssetTo(_to, assetId);

    // TODO: Implement EIP 820
    if (isContract(_to)) {
      require(_reentrancy == false);
      _reentrancy = true;
      IAssetHolder(_to).onAssetReceived(assetId, holder, _to, userData, operator, operatorData);
      _reentrancy = false;
    }

    Transfer(holder, _to, assetId, operator, userData, operatorData);
  }

  //
  // Update related functions
  //

  modifier onlyIfUpdateAllowed(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender
         || isOperatorAuthorizedFor(msg.sender, _holderOf[assetId]));
    _;
  }

  function update(uint256 _assetId, string _data) onlyIfUpdateAllowed(_assetId) public {
    _assetData[_assetId] = _data;
    Update(_assetId, _holderOf[_assetId], msg.sender, _data);
  }

  //
  // Utilities
  //

  function isContract(address addr) internal returns (bool) {
    uint size;
    assembly { size := extcodesize(addr) }
    return size > 0;
  }
}
