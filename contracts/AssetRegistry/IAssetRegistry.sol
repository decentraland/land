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
  function exists(uint256 assetId) public constant returns (bool);
  function holderOf(uint256 assetId) public constant returns (address);
  function assetData(uint256 assetId) public constant returns (string);

  /**
   * Holder-centric getter functions
   */
  function assetsCount(address holder) public constant returns (uint256);
  function assetByIndex(address holder, uint256 index) public constant returns (uint256);
  function allAssetsOf(address holder) public constant returns (uint256[]);

  /**
   * Transfer Operations
   */
  function transfer(address to, uint256 assetId) public;
  function transfer(address to, uint256 assetId, bytes userData) public;
  function operatorTransfer(address to, uint256 assetId, bytes userData, bytes operatorData) public;

  /**
   * Data modification operations
   */
  function update(uint256 assetId, string data) public;

  /**
   * Supply-altering operations
   */
  function generate(uint256 assetId, string data) public;
  function destroy(uint256 assetId) public;

  /**
   * Authorization operations
   */
  function authorizeOperator(address operator, bool authorized) public;

  /**
   * Authorization getters
   */
  function isOperatorAuthorizedFor(address operator, address assetHolder)
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
