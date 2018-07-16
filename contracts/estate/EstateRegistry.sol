pragma solidity ^0.4.22;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

import '../metadata/MetadataHolderBase.sol';

contract PingableDAR {
  function ping() public;
  function ownerOf(uint256 tokenId) public returns (address);
  function safeTransferFrom(address, address, uint256) public;
}

// @nico TODO: owner: it's on the constructor (Factory)
// @nico TODO: token-assetId modifier
// @nico TODO: Standalone Storage. This is kind of a mess if we want to use Zeppelin
// @nico TODO: transferOwnership cleans _operators?
// @nico TODO: Comment functions
// @nico TODO: Metadata management (if on Estate, ask parent?)
contract EstateRegistry is ERC721Token, Ownable, MetadataHolderBase {
  using SafeMath for uint256;

  PingableDAR public dar;

  string public data;

  mapping(address => uint256[]) public assetTokenIds;
  mapping(address => mapping(uint256 => uint256)) public assetTokenIndex;

  mapping(address => string) internal assetData;
  mapping (address => address) public updateOperator;

  constructor(
    string _name,
    string _symbol,
    address _dar,
    address _owner
  )
    ERC721Token(_name, _symbol)
    Ownable()
    public
  {
    require(_dar != 0);
    dar = PingableDAR(_dar);
    owner = _owner; // @nico TODO: ownership while being created by another registry
  }

  modifier onlyDAR() {
    require(msg.sender == address(dar));
    _;
  }

  modifier onlyAuthorized(address assetId) {
    require(_isAuthorized(msg.sender, assetId), 'Unauthorized user');
    _;
  }

  modifier onlyUpdateAuthorized(address assetId) {
    require(_isUpdateAuthorized(msg.sender, assetId), 'Unauthorized user');
    _;
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
    address assetId = address(this);
    uint256[] storage tokenIds = assetTokenIds[assetId];
    mapping(uint256 => uint256) tokenIndex = assetTokenIndex[assetId];

    /**
     * tokenId is a list of owned tokens
     */
    tokenIds.push(tokenId);

    /**
     * tokenIndex is the position (1-based) of the token in the array
     */
    tokenIndex[tokenId] = tokenIds.length;

    return bytes4(0xf0b9e5ba);
  }

  function ammendReceived(address assetId, uint256 tokenId) external {
    uint256[] storage tokenIds = assetTokenIds[assetId];
    mapping(uint256 => uint256) tokenIndex = assetTokenIndex[assetId];

    require(tokenIndex[tokenId] == 0);
    require(dar.ownerOf(tokenId) == assetId);

    tokenIds.push(tokenId);
    tokenIndex[tokenId] = tokenIds.length;
  }

  function transferTo(
    address assetId,
    uint256 tokenId,
    address destinatory
  )
    onlyAuthorized(assetId)
    external
  {
    return _transferTo(assetId, tokenId, destinatory);
  }

  function _transferTo(
    address assetId,
    uint256 tokenId,
    address destinatory
  )
    internal
  {
    uint256[] storage tokenIds = assetTokenIds[assetId];
    mapping(uint256 => uint256) tokenIndex = assetTokenIndex[assetId];

    /**
     * Using 1-based indexing to be able to make this check
     */
    require(tokenIndex[tokenId] != 0);

    uint lastIndexInArray = tokenIds.length - 1;

    /**
     * Get the tokenIndex of this token in the tokenIds list
     */
    uint indexInArray = tokenIndex[tokenId] - 1;

    /**
     * Get the tokenId at the end of the tokenIds list
     */
    uint tempTokenId = tokenIds[lastIndexInArray];

    /**
     * Store the last token in the position previously occupied by tokenId
     */
    tokenIndex[tempTokenId] = indexInArray + 1;
    tokenIds[indexInArray] = tempTokenId;

    /**
     * Delete the tokenIds[last element]
     */
    delete tokenIds[lastIndexInArray];
    tokenIds.length = lastIndexInArray;

    /**
     * Drop this tokenId from both the tokenIndex and tokenId list
     */
    tokenIndex[tokenId] = 0;

    dar.safeTransferFrom(assetId, destinatory, tokenId);
  }

  function transferMany(address assetId, uint256[] tokens, address destinatory) onlyAuthorized(assetId) external {
    uint length = tokens.length;
    for (uint i = 0; i < length; i++) {
      _transferTo(assetId, tokens[i], destinatory);
    }
  }

  // @nico TODO: Revise this
  function ping() onlyOwner external {
    dar.ping();
  }

  function getSize(address assetId) external view returns (uint256) {
    return assetTokenIds[assetId].length;
  }

  function updateMetadata(address assetId, string _data) external onlyUpdateAuthorized(assetId) {
    assetData[assetId] = _data;
  }

  function getMetadata(address assetId)
    view
    external
    returns (string)
  {
    return assetData[assetId];
  }

  // @nico TODO: holderOf ?
  function setUpdateOperator(address assetId, address operator) external onlyOwner {
    updateOperator[assetId] = operator;
  }

  // @nico TODO: I don't like inverting the params here in terms of `setUpdateOperator`,
  // but LANDRegistry does this, so might be best to be consistent
  function isUpdateAuthorized(address operator, address assetId) external view returns (bool) {
    return _isUpdateAuthorized(operator, assetId);
  }

  function _isUpdateAuthorized(address operator, address assetId) internal view returns (bool) {
    // @nico: TODO: operator == ownerOf(assetId)
    return owner == operator || updateOperator[assetId] == operator;
  }

  function isAuthorized(address _operator, address assetId) external view returns (bool) {
    return _isAuthorized(_operator, assetId);
  }

  function _isAuthorized(address _operator, address assetId) internal view returns (bool) {
    // @nico TODO: Revise this
    require(_operator != address(0));
    // @nico TODO: _operator == ownerOf(assetId)
    return owner == _operator || isApprovedForAll(owner, _operator);
  }
}
