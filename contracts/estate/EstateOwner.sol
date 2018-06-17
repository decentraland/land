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
  address public approved;

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

  modifier onlyDAR() {
    require(msg.sender == address(dar));
    _;
  }

  modifier onlyAuthorized() {
    require(_isAuthorized(msg.sender));
    _;
  }

  function transferOwnership(address to) external onlyOwner {
    require(to != 0);
    operator = 0;
    _clearAuthorization();
    owner = to;
  }

  // onERC721Received: Count
  function onERC721Received(
    address /* oldOwner */,
    uint256 tokenId,
    bytes // unused
  )
    external
    onlyDAR
    returns (bytes4)
  {
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
    require(index[tokenId] == 0);
    require(dar.ownerOf(tokenId) == address(this));

    tokenIds.push(tokenId);
    index[tokenId] = tokenIds.length;
  }

  function transferTo(
    uint256 tokenId,
    address destinatory
  )
    onlyAuthorized
    external
  {
    return _transferTo(tokenId, destinatory);
  }

  function _transferTo(
    uint256 tokenId,
    address destinatory
  )
    internal
  {
    /**
     * Using 1-based indexing to be able to make this check
     */
    require(index[tokenId] != 0);

    uint lastIndexInArray = tokenIds.length - 1;

    /**
     * Get the index of this token in the tokenIds list
     */
    uint indexInArray = index[tokenId] - 1;

    /**
     * Get the tokenId at the end of the tokenIds list
     */
    uint tempTokenId = tokenIds[lastIndexInArray];

    /**
     * Store the last token in the position previously occupied by tokenId
     */
    index[tempTokenId] = indexInArray + 1;
    tokenIds[indexInArray] = tempTokenId;

    /**
     * Delete the tokenIds[last element]
     */
    delete tokenIds[lastIndexInArray];
    tokenIds.length = lastIndexInArray;

    /**
     * Drop this tokenId from both the index and tokenId list
     */
    index[tokenId] = 0;

    dar.safeTransferFrom(this, destinatory, tokenId);
  }

  function transferMany(
    uint256[] tokens,
    address destinatory
  )
    external
    onlyAuthorized
  {
    uint length = tokens.length;
    for (uint i = 0; i < length; i++) {
      _transferTo(tokens[i], destinatory);
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


  function isApprovedForAll(address _operator)
    external view returns (bool)
  {
    return _isApprovedForAll(_operator);
  }
  function _isApprovedForAll(address _operator)
    internal view returns (bool)
  {
    return _operator == approved;
  }

  function isAuthorized(address _operator)
    external
    view
    returns (bool)
  {
    return _isAuthorized(_operator);
  }
  function _isAuthorized(address _operator)
    internal
    view
    returns (bool)
  {
    return (_operator == owner) || (_operator == approved);
  }

  event ApprovalForAll(
    address operator,
    bool authorized
  );

  function setApprovalForAll(address _operator, bool authorized)
    external
    onlyOwner
  {
    return _setApprovalForAll(_operator, authorized);
  }
  function _setApprovalForAll(address _operator, bool authorized) internal {
    if (authorized) {
      require(!_isApprovedForAll(_operator));
      _addAuthorization(_operator);
    } else {
      require(_isApprovedForAll(_operator));
      _clearAuthorization();
    }
    emit ApprovalForAll(_operator, authorized);
  }

  function _addAuthorization(address _operator) private {
    approved = _operator;
  }

  function _clearAuthorization() private {
    approved = 0;
  }
}
