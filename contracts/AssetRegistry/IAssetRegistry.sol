pragma solidity ^0.4.18;

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
  function operatorSend(uint256 _assetId, address _to, bytes userData, bytes operatorData) public;

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
