pragma solidity ^0.4.22;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import '../metadata/MetadataHolderBase.sol';

contract PingableDAR {
  function ping() public;
  function ownerOf(uint256 tokenId) public returns (address);
  function safeTransferFrom(address, address, uint256) public;
}

contract EstateOwner is MetadataHolderBase {
  using SafeMath for uint256;

  PingableDAR public dar;

  string public data;
  address public operator;
  address public owner;

  uint256[] public tokenIds;
  mapping(uint256 => uint256) public index;

  constructor(
    address _dar,
    address _owner
  )
    public
  {
    require(_dar != 0);
    dar = PingableDAR(_dar);
    owner = _owner;
  }

  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  function transferOwnership(address to) external {
    require(to != 0);
    owner = to;
  }

  // onERC721Received: Count
  function onERC721Received(
    address /* oldOwner */,
    uint256 tokenId,
    bytes // unused
  )
    external
    returns (bytes4)
  {
    require(msg.sender == address(dar));

    /**
     * tokenId is a list of owned tokens
     */
    tokenIds.push(tokenId);

    /**
     * index is the position (1-based) of the token in the array
     */
    index[tokenId] = tokenIds.length;

    return bytes4(0xf0b9e5ba);
  }

  function detectReceived(uint256 tokenId) external {
    require(tokenIds[tokenId] == 0);
    require(dar.ownerOf(tokenId) == address(this));

    tokenIds.push(tokenId);
    index[tokenId] = tokenIds.length;
  }

  function send(
    uint256 tokenId,
    address destinatory
  )
    external
  {
    return _send(tokenId, destinatory);
  }

  function _send(
    uint256 tokenId,
    address destinatory
  )
    internal
    onlyOwner
  {
    /**
     * Using 1-based indexing to be able to make this check
     */
    require(index[tokenId] != 0);

    uint lastIndex = tokenIds.length - 1;

    /**
     * Get the index of this token in the tokenIds list
     */
    uint indexInArray = index[tokenId] - 1;

    /**
     * Get the tokenId at the end of the tokenIds list
     */
    uint tempTokenId = tokenIds[lastIndex];

    /**
     * Store the last token in the position previously occupied by tokenId
     */
    index[tempTokenId] = indexInArray + 1;
    tokenIds[indexInArray] = tempTokenId;
    tokenIds.length = lastIndex;

    /**
     * Drop this tokenId from both the index and tokenId list
     */
    index[tokenId] = 0;
    delete tokenIds[lastIndex];

    dar.safeTransferFrom(this, destinatory, tokenId);
  }

  function transferMany(
    uint256[] tokens,
    address destinatory
  )
    external
  {
    uint length = tokens.length;
    for (uint i = 0; i < length; i++) {
      _send(tokens[i], destinatory);
    }
  }

  function size() external view returns (uint256) {
    return tokenIds.length;
  }

  function updateMetadata(
    string _data
  )
    external
    onlyUpdateAuthorized
  {
    data = _data;
  }

  function getMetadata(uint256 /* assetId */)
    view
    external
    returns (string)
  {
    return data;
  }

  // updateMetadata

  modifier onlyUpdateAuthorized() {
    require(_isUpdateAuthorized(msg.sender), 'unauthorized user');
    _;
  }

  function setUpdateOperator(
    address _operator
  )
    external
    onlyOwner
  {
    operator = _operator;
  }

  function isUpdateAuthorized(
    address _operator
  )
    external
    view
    returns (bool)
  {
    return _isUpdateAuthorized(_operator);
  }

  function _isUpdateAuthorized(
    address _operator
  )
    internal
    view
    returns (bool)
  {
    return owner == _operator || operator == _operator;
  }

  function ping() onlyUpdateAuthorized external {
    dar.ping();
  }
}
