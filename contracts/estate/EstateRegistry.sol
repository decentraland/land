pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "./IEstateRegistry.sol";
import "../metadata/MetadataHolderBase.sol";


contract PingableDAR {
  function ping() public;
  function ownerOf(uint256 tokenId) public returns (address);
  function safeTransferFrom(address, address, uint256) public;
}


// @nico TODO: Standalone Storage.
// @nico TODO: Document functions.
contract EstateRegistry is ERC721Token, Ownable, MetadataHolderBase, IEstateRegistry {
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

  // Operator of the Estate
  mapping (uint256 => address) internal updateOperator;

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
    uint256 tokenId = _getNewTokenId();
    _mint(to, tokenId);
    return tokenId;
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
    if(estateTokenIdBytes.length > 0) {
      uint256 estateId = uint256(_bytesToBytes32(estateTokenIdBytes));
      _pushTokenId(estateId, tokenId);
    }
    return bytes4(0xf0b9e5ba);
  }

  function ammendReceived(uint256 estateId, uint256 tokenId) external {
    _pushTokenId(estateId, tokenId);
    emit AmmendReceived(estateId, tokenId);
  }

  function transferToken(
    uint256 estateId,
    uint256 tokenId,
    address destinatary
  )
    onlyAuthorized(estateId)
    external
  {
    return _transferToken(estateId, tokenId, destinatary);
  }

  function transferManyTokens(uint256 estateId, uint256[] tokens, address destinatary) onlyAuthorized(estateId) external {
    uint length = tokens.length;
    for (uint i = 0; i < length; i++) {
      _transferToken(estateId, tokens[i], destinatary);
    }
  }

  function getTokenEstateId(uint256 tokenId) external view returns (uint256) {
    return tokenIdEstate[tokenId];
  }

  function setPingableDAR(address _dar) onlyOwner external {
    require(_dar != 0);
    dar = PingableDAR(_dar);
    emit SetPingableDAR(dar);
  }

  function ping() onlyOwner external {
    dar.ping();
  }

  function getSize(uint256 estateId) external view returns (uint256) {
    return estateTokenIds[estateId].length;
  }

  function updateMetadata(uint256 estateId, string metadata) external onlyUpdateAuthorized(estateId) {
    estateData[estateId] = metadata;

    emit Update(
      estateId,
      ownerOf(estateId),
      msg.sender,
      metadata
    );
  }

  function getMetadata(uint256 estateId)
    view
    external
    returns (string)
  {
    return estateData[estateId];
  }

  function setUpdateOperator(uint256 estateId, address operator) external onlyAuthorized(estateId) {
    updateOperator[estateId] = operator;
    emit UpdateOperator(estateId, operator);
  }

  // I don't like inverting the params here in terms of `setUpdateOperator`,
  // but LANDRegistry does this, so might be best to be consistent
  function isUpdateAuthorized(address operator, uint256 estateId) external view returns (bool) {
    return _isUpdateAuthorized(operator, estateId);
  }

  function isAuthorized(address operator, uint256 estateId) external view returns (bool) {
    return _isAuthorized(operator, estateId);
  }

  function _getNewTokenId() internal view returns (uint256) {
    // This is not bullet-proof, but it'll be reinforced by the ERC721 uniqueness of the tokenId
    // solium-disable-next-line security/no-block-members
    return uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp)));
  }

  function _pushTokenId(uint256 estateId, uint256 tokenId) internal {
    require(estateTokenIndex[estateId][tokenId] == 0);
    require(dar.ownerOf(tokenId) == address(this));

    estateTokenIds[estateId].push(tokenId);

    tokenIdEstate[tokenId] = estateId;

    estateTokenIndex[estateId][tokenId] = estateTokenIds[estateId].length;
  }

  function _transferToken(
    uint256 estateId,
    uint256 tokenId,
    address destinatary
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

    dar.safeTransferFrom(this, destinatary, tokenId);
  }

  function _isUpdateAuthorized(address operator, uint256 estateId) internal view returns (bool) {
    return owner == operator || operator == ownerOf(estateId) || updateOperator[estateId] == operator;
  }

  function _isAuthorized(address operator, uint256 estateId) internal view returns (bool) {
    require(operator != address(0));
    return owner == operator || operator == ownerOf(estateId) || isApprovedForAll(ownerOf(estateId), operator);
  }

  function _bytesToBytes32(bytes b) private pure returns (bytes32) {
    bytes32 out;

    for (uint i = 0; i < 32; i++) {
      out |= bytes32(b[i] & 0xFF) >> (i * 8);
    }
    return out;
  }
}
