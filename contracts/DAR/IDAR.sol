contract AssetRegistry {
  function name() public constant returns (string);
  /* optional */ function symbol() public constant returns (string);
  function totalSupply() public constant returns (uint256);

  function assetCount(address owner) public constant returns (uint256);
  function assetByIndex(address owner, uint256 index) public constant returns (uint256);
  function assetsOf(address owner) public constant returns (uint256[]);
  function assetDataOf(address owner) public constant returns (string[]);
  function assetData(uint256 assetId) public constant returns (string);

  function send(address to, uint256 assetId) public;
  function send(address to, uint256 assetId, bytes userData) public;

  function update(uint256 assetId, string data) public;

  function create(uint256 assetId, string data) public;
  function destroy(uint256 assetId) public;

  function authorizeOperator(address operator, bool authorized) public;
  function isOperatorAuthorizedFor(address operator, address tokenHolder) public constant returns (bool);

  event Send(
    address indexed from,
    address indexed to,
    uint256 indexed assetId,
    address operator,
    bytes ownerData,
    bytes operatorData
  );
  event Create(
    address indexed owner,
    uint256 indexed assetId,
    string data
  );
  event Update(
    uint256 indexed assetId,
    address indexed owner,
    string data
  );
  event Destroy(
    address indexed owner,
    uint256 indexed assetId
  );
  event AuthorizeOperator(
    address indexed operator,
    address indexed owner,
    bool authorized
  );
}
