pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../metadata/MetadataHolderBase.sol";


contract PingableDAR {
  function ping() public;
  function ownerOf(uint256 tokenId) public returns (address);
  function safeTransferFrom(address, address, uint256) public;
}


// @nico TODO: Standalone Storage.
// @nico TODO: Document functions
// @nico TODO: transferOwnership cleans _operators?
contract EstateRegistry is ERC721Token, Ownable, MetadataHolderBase {
  using SafeMath for uint256;

  PingableDAR public dar;

  // From Estate to list of owned tokenIds (LANDs)
  mapping(uint256 => uint256[]) public estateTokenIds;

  // From tokenId (LAND) to its owner estateId of owned tokenIds
  mapping(uint256 => uint256) public tokenIdEstate;

  // From Estate to mapping of tokenId to index on the array above
  mapping(uint256 => mapping(uint256 => uint256)) public estateTokenIndex;

  // Metadata of the Estate
  mapping(uint256 => string) internal estateData;

  // Operators of the Estate
  mapping (uint256 => address) public updateOperator;

  constructor(
    string _name,
    string _symbol,
    address _dar
  )
    ERC721Token(_name, _symbol)
    Ownable()
    public
  {
    require(_dar != 0);
    dar = PingableDAR(_dar);
  }

  modifier onlyDAR() {
    require(msg.sender == address(dar));
    _;
  }

  modifier onlyAuthorized(uint256 estateId) {
    require(_isAuthorized(msg.sender, estateId), "Unauthorized user");
    _;
  }

  modifier onlyUpdateAuthorized(uint256 estateId) {
    require(_isUpdateAuthorized(msg.sender, estateId), "Unauthorized user");
    _;
  }

  function mintNext(address to) public returns (uint256) {
    uint256 tokenId = getNewTokenId();
    _mint(to, tokenId);
    return tokenId;
  }

  function getNewTokenId() internal view returns (uint256) {
    // This is not bullet-proof, but it'll be reinforced by the ERC721 uniqueness of the tokenId
    return uint256(keccak256(msg.sender, block.timestamp));
  }

  // onERC721Received: Count
  function onERC721Received(
    address /* oldOwner */,
    uint256 tokenId,
    bytes estateTokenIdBytes
  )
    external
    onlyDAR
    returns (bytes4)
  {
    uint256 estateId = bytesToBytes32(estateTokenIdBytes);
    _pushTokenId(estateId, tokenId);
    return bytes4(0xf0b9e5ba);
  }

  function ammendReceived(uint256 estateId, uint256 tokenId) external {
    _pushTokenId(estateId, tokenId);
  }

  function _pushTokenId(uint256 estateId, uint256 tokenId) internal {
    require(estateTokenIds[estateId][tokenId] == 0);
    require(dar.ownerOf(tokenId) == estateId);

    estateTokenIds[estateId].push(tokenId);

    tokenIdEstate[tokenId] = estateId;

    estateTokenIds[estateId][tokenId] = estateTokenIds[estateId].length;
  }

  function transferToken(
    uint256 estateId,
    uint256 tokenId,
    address destinatory
  )
    onlyAuthorized(estateId)
    external
  {
    return _transferToken(estateId, tokenId, destinatory);
  }

  function _transferToken(
    uint256 estateId,
    uint256 tokenId,
    address destinatory
  )
    internal
  {
    uint256[] storage tokenIds = estateTokenIds[estateId];
    mapping(uint256 => uint256) tokenIndex = estateTokenIndex[estateId];

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

    /**
     * Drop this tokenId estate
     */
    tokenIdEstate[tokenId] = 0;

    dar.safeTransferFrom(estateId, destinatory, tokenId);
  }

  function getTokenEstateId(uint256 tokenId) external view returns(uint256) {
    return tokenIdEstate[tokenId];
  }

  function transferManyTokens(uint256 estateId, uint256[] tokens, address destinatory) onlyAuthorized(estateId) external {
    uint length = tokens.length;
    for (uint i = 0; i < length; i++) {
      _transferToken(estateId, tokens[i], destinatory);
    }
  }

  // @nico TODO: Revise this
  function ping() onlyOwner external {
    dar.ping();
  }

  function getSize(uint256 estateId) external view returns (uint256) {
    return estateTokenIds[estateId].length;
  }

  function updateMetadata(uint256 estateId, string metadata) external onlyUpdateAuthorized(estateId) {
    estateData[estateId] = metadata;
  }

  function getMetadata(uint256 estateId)
    view
    external
    returns (string)
  {
    return estateData[estateId];
  }

  // @nico TODO: holderOf ?
  function setUpdateOperator(uint256 estateId, address operator) external onlyOwner {
    updateOperator[estateId] = operator;
  }

  // @nico TODO: I don't like inverting the params here in terms of `setUpdateOperator`,
  // but LANDRegistry does this, so might be best to be consistent
  function isUpdateAuthorized(address operator, uint256 estateId) external view returns (bool) {
    return _isUpdateAuthorized(operator, estateId);
  }

  function _isUpdateAuthorized(address operator, uint256 estateId) internal view returns (bool) {
    return owner == operator || operator == ownerOf(estateId) || updateOperator[estateId] == operator;
  }

  function isAuthorized(address operator, uint256 estateId) external view returns (bool) {
    return _isAuthorized(operator, estateId);
  }

  function _isAuthorized(address operator, uint256 estateId) internal view returns (bool) {
    require(operator != address(0));
    return owner == operator || operator == ownerOf(estateId) || isApprovedForAll(owner, operator);
  }

  function bytesToBytes32(bytes b, uint offset) private pure returns (bytes32) {
    bytes32 out;

    for (uint i = 0; i < 32; i++) {
      out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
    }
    return out;
  }
}
