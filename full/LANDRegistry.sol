pragma solidity ^0.4.18;

// File: contracts/AssetRegistry/Storage.sol

contract AssetRegistryStorage {

  string internal _name;
  string internal _symbol;
  string internal _description;

  /**
   * Stores the total count of assets managed by this registry
   */
  uint256 internal _count;

  /**
   * Stores an array of assets owned by a given account
   */
  mapping(address => uint256[]) internal _assetsOf;

  /**
   * Stores the current holder of an asset
   */
  mapping(uint256 => address) internal _holderOf;

  /**
   * Stores the index of an asset in the `_assetsOf` array of its holder
   */
  mapping(uint256 => uint256) internal _indexOfAsset;

  /**
   * Stores the data associated with an asset
   */
  mapping(uint256 => string) internal _assetData;

  /**
   * For a given account, for a given opperator, store whether that operator is
   * allowed to transfer and modify assets on behalf of them.
   */
  mapping(address => mapping(address => bool)) internal _operators;

  /**
   * Simple reentrancy lock
   */
  bool internal _reentrancy;
}

// File: contracts/AssetRegistry/AssetAccessRegistry.sol

/**
 * Asset-centric getter functions
 */
contract AssetAccessRegistry is AssetRegistryStorage {
  function exists(uint256 _assetId) public constant returns (bool) {
    return _holderOf[_assetId] != 0;
  }
  function holderOf(uint256 _assetId) public constant returns (address) {
    return _holderOf[_assetId];
  }
  function assetData(uint256 _assetId) public constant returns (string) {
    return _assetData[_assetId];
  }
}

// File: contracts/AssetRegistry/HolderAccessRegistry.sol

/**
 * Holder-centric getter functions
 */
contract HolderAccessRegistry is AssetRegistryStorage {

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

  function isOperatorAuthorizedFor(address _operator, address _assetHolder)
    public constant returns (bool)
  {
    return _operators[_assetHolder][_operator];
  }
}

// File: contracts/AssetRegistry/IAssetRegistry.sol

interface IAssetRegistry {

  /**
   * Global Registry getter functions
   */
  function name() public constant returns (string);
  function symbol() public constant returns (string);
  function description() public constant returns (string);
  function totalSupply() public constant returns (uint256);

  /**
   * Asset-centric getter functions
   */
  function exists(uint256 _assetId) public constant returns (bool);
  function holderOf(uint256 _assetId) public constant returns (address);
  function assetData(uint256 _assetId) public constant returns (string);

  /**
   * Holder-centric getter functions
   */
  function assetsCount(address _holder) public constant returns (uint256);
  function assetByIndex(address _holder, uint256 _index) public constant returns (uint256);
  function allAssetsOf(address _holder) public constant returns (uint256[]);

  /**
   * Transfer Operations
   */
  function send(address _to, uint256 _assetId) public;
  function send(address _to, uint256 _assetId, bytes _userData) public;
  function operatorSend(address _to, uint256 _assetId, bytes userData, bytes operatorData) public;

  /**
   * Data modification operations
   */
  function update(uint256 _assetId, string _data) public;

  /**
   * Supply-altering operations
   */
  function create(uint256 _assetId, string _data) public;
  function destroy(uint256 _assetId) public;

  /**
   * Authorization operations
   */
  function authorizeOperator(address _operator, bool _authorized) public;

  /**
   * Authorization getters
   */
  function isOperatorAuthorizedFor(address _operator, address _assetHolder)
    public constant returns (bool);

  /**
   * Events
   */
  event Transfer(
    address indexed from,
    address indexed to,
    uint256 indexed assetId,
    address operator,
    bytes userData,
    bytes operatorData
  );
  event Create(
    address indexed holder,
    uint256 indexed assetId,
    address indexed operator,
    string data
  );
  event Update(
    uint256 indexed assetId,
    address indexed holder,
    address indexed operator,
    string data
  );
  event Destroy(
    address indexed holder,
    uint256 indexed assetId,
    address indexed operator
  );
  event AuthorizeOperator(
    address indexed operator,
    address indexed holder,
    bool authorized
  );
}

// File: zeppelin-solidity/contracts/math/SafeMath.sol

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    assert(c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

// File: contracts/AssetRegistry/AuthorizedAssetRegistry.sol

/**
 * Authorization getters
 */
contract AuthorizedAssetRegistry is AssetRegistryStorage, IAssetRegistry, HolderAccessRegistry {
  using SafeMath for uint256;

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
}

// File: contracts/AssetRegistry/GlobalAssetRegistry.sol

contract GlobalAssetRegistry is AssetRegistryStorage {
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
}

// File: contracts/AssetRegistry/InternalOperationsAssetRegistry.sol

contract InternalOperationsAssetRegistry is AssetRegistryStorage,
  IAssetRegistry,
  GlobalAssetRegistry, AssetAccessRegistry, HolderAccessRegistry
{
  using SafeMath for uint256;

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
}

// File: contracts/AssetRegistry/SupplyAssetRegistry.sol

/**
 * Supply-altering operations
 */
contract SupplyAssetRegistry is AssetRegistryStorage, IAssetRegistry,
  InternalOperationsAssetRegistry, AuthorizedAssetRegistry
{

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
}

// File: contracts/AssetRegistry/IAssetHolder.sol

interface IAssetHolder {
  function onAssetReceived(
    /* address _assetRegistry == msg.sender */
    uint256 _assetId,
    address _previousHolder,
    address _currentHolder,
    bytes   _userData,
    address _operator,
    bytes   _operatorData
  ) public;
}

// File: contracts/AssetRegistry/TransferableAssetRegistry.sol

/**
 * Transfer Operations
 */
contract TransferableAssetRegistry is AssetRegistryStorage, IAssetRegistry, InternalOperationsAssetRegistry, AuthorizedAssetRegistry {

  modifier onlyHolder(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender);
    _;
  }

  modifier onlyOperator(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender
         || isOperatorAuthorizedFor(msg.sender, _holderOf[assetId]));
    _;
  }

  function send(address _to, uint256 _assetId)
    onlyHolder(_assetId)
    public
  {
    return doSend(_to, _assetId, '', 0, '');
  }

  function send(address _to, uint256 _assetId, bytes _userData)
    onlyHolder(_assetId)
    public
  {
    return doSend(_to, _assetId, _userData, 0, '');
  }

  function operatorSend(
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

  function isContract(address addr) internal returns (bool) {
    uint size;
    assembly { size := extcodesize(addr) }
    return size > 0;
  }
}

// File: contracts/AssetRegistry/UpdatableAssetRegistry.sol

/**
 * Data modification operations
 */
contract UpdatableAssetRegistry is AssetRegistryStorage, IAssetRegistry
{
  modifier onlyIfUpdateAllowed(uint256 assetId) {
    require(_holderOf[assetId] == msg.sender
         || isOperatorAuthorizedFor(msg.sender, _holderOf[assetId]));
    _;
  }

  function update(uint256 _assetId, string _data) onlyIfUpdateAllowed(_assetId) public {
    _assetData[_assetId] = _data;
    Update(_assetId, _holderOf[_assetId], msg.sender, _data);
  }
}

// File: contracts/AssetRegistry/StandardAssetRegistry.sol

contract StandardAssetRegistry is
  AssetRegistryStorage, IAssetRegistry,
  GlobalAssetRegistry, AssetAccessRegistry, HolderAccessRegistry,
  InternalOperationsAssetRegistry, AuthorizedAssetRegistry,
  TransferableAssetRegistry, UpdatableAssetRegistry,
  SupplyAssetRegistry
{
}

// File: contracts/Upgradable/IApplication.sol

contract IApplication {
  function initialize(bytes data) public;
}

// File: contracts/Upgradable/OwnableStorage.sol

contract OwnableStorage {
  address public owner;

  function OwnableStorage() {
    owner = msg.sender;
  }
}

// File: contracts/Upgradable/Ownable.sol

contract Ownable is OwnableStorage, IApplication {

  event OwnerUpdate(address _prevOwner, address _newOwner);

  function initialize(bytes) public {
    owner = msg.sender;
  }

  modifier onlyOwner {
    assert(msg.sender == owner);
    _;
  }

  function transferOwnership(address _newOwner) public onlyOwner {
    require(_newOwner != owner);
    owner = _newOwner;
  }
}

// File: contracts/Land/ILANDRegistry.sol

interface ILANDRegistry {
  function assignNewParcel(uint x, uint y, address beneficiary, string data) public;
  function assignNewParcel(uint x, uint y, address beneficiary) public;
  function assignMultipleParcels(uint[] x, uint[] y, address beneficiary) public;
  function assignMultipleParcels(uint[] x, uint[] y, address[] beneficiary) public;

  function ping() public;
  function clearLand(uint[] x, uint[] y) public;

  function buildTokenId(uint x, uint y) view public returns (uint256);
  function exists(uint x, uint y) view public returns (bool);
  function ownerOfLand(uint x, uint y) view public returns (address);
  function landData(uint x, uint y) view public returns (string);

  function transferLand(uint x, uint y, address to) public;
  function transferManyLand(uint[] x, uint[] y, address to) public;

  function updateLandData(uint x, uint y, string _metadata) public;
  function updateManyLandData(uint[] x, uint[] y, string data) public;
}

// File: contracts/Land/LANDStorage.sol

contract LANDStorage is OwnableStorage, AssetRegistryStorage {

  mapping (address => uint) latestPing;

}

// File: contracts/Land/AssignableLAND.sol

contract AssignableLAND is StandardAssetRegistry, Ownable, LANDStorage, ILANDRegistry {

  function assignNewParcel(uint x, uint y, address beneficiary, string data) public {
    create(buildTokenId(x, y), beneficiary, data);
  }

  function assignNewParcel(uint x, uint y, address beneficiary) public {
    create(buildTokenId(x, y), beneficiary, '');
  }

  function assignMultipleParcels(uint[] x, uint[] y, address beneficiary) public {
    for (uint i = 0; i < x.length; i++) {
      create(buildTokenId(x[i], y[i]), beneficiary, '');
    }
  }

  function assignMultipleParcels(uint[] x, uint[] y, address[] beneficiary) public {
    for (uint i = 0; i < x.length; i++) {
      create(buildTokenId(x[i], y[i]), beneficiary[i], '');
    }
  }

  function create(uint256 _assetId, address _beneficiary, string _data) onlyOwner public {
    require(_holderOf[_assetId] == 0);
    _addAssetTo(_beneficiary, _assetId, _data);
    Create(_beneficiary, _assetId, msg.sender, _data);
  }

  function destroy(uint256 _assetId) onlyOwner public {
    _removeAssetFrom(_holderOf[_assetId], _assetId);
    Destroy(_holderOf[_assetId], _assetId, msg.sender);
  }
}

// File: contracts/Land/ClearableLAND.sol

contract ClearableLAND is InternalOperationsAssetRegistry, Ownable, LANDStorage, ILANDRegistry {

  function ping() public {
    latestPing[msg.sender] = now;
  }

  function setLatestToNow(address user) onlyOwner public {
    latestPing[user] = now;
  }

  function clearLand(uint[] x, uint[] y) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      uint landId = buildTokenId(x[i], y[i]);
      address holder = holderOf(landId);
      if (latestPing[holder] < now - 1 years) {
        _removeAssetFrom(holder, landId);
        Destroy(holder, landId, msg.sender);
      }
    }
  }
}

// File: contracts/Land/LANDAccessors.sol

contract LANDAccessors is IAssetRegistry, ILANDRegistry {

  uint256 constant clearLow = 0xffffffffffffffff0000000000000000;
  uint256 constant clearHigh = 0x0000000000000000ffffffffffffffff;

  function buildTokenId(uint x, uint y) view public returns (uint256) {
    return ((x << 128) & clearLow) | (y & clearHigh);
  }

  function exists(uint x, uint y) view public returns (bool) {
    return exists(buildTokenId(x, y));
  }
  function ownerOfLand(uint x, uint y) view public returns (address) {
    return holderOf(buildTokenId(x, y));
  }
  function landData(uint x, uint y) view public returns (string) {
    return assetData(buildTokenId(x, y));
  }
}

// File: contracts/Land/TransferableLAND.sol

contract TransferableLAND is TransferableAssetRegistry, LANDStorage, ILANDRegistry {
  function transferLand(uint x, uint y, address to) public {
    return send(to, buildTokenId(x, y));
  }

  function transferManyLand(uint[] x, uint[] y, address to) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      return send(to, buildTokenId(x[i], y[i]));
    }
  }
}

// File: contracts/Land/UpdatableLAND.sol

contract UpdatableLAND is UpdatableAssetRegistry, LANDStorage, ILANDRegistry {
  function updateLandData(uint x, uint y, string _metadata) public {
    return update(buildTokenId(x, y), _metadata);
  }
  function updateManyLandData(uint[] x, uint[] y, string data) public {
    require(x.length == y.length);
    for (uint i = 0; i < x.length; i++) {
      update(buildTokenId(x[i], y[i]), data);
    }
  }
}

// File: contracts/Land/LANDRegistry.sol

contract LANDRegistry is StandardAssetRegistry, LANDStorage,
  ILANDRegistry,
  LANDAccessors, AssignableLAND, ClearableLAND, TransferableLAND, UpdatableLAND
{
  function initialize(bytes /* data */) public {
    initialize();
  }

  function initialize() public {
    if (owner != 0) {
      return;
    }
    owner = msg.sender;
    _name = 'Decentraland Land';
    _symbol = 'LAND';
    _description = 'Contract that stores the Decentraland LAND registry';
  }
}
