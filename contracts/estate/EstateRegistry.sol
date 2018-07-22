pragma solidity ^0.4.22;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "./IEstateRegistry.sol";
import "../metadata/MetadataHolderBase.sol";


contract LandRegistry {
  function ping() public;
  function ownerOf(uint256 tokenId) public returns (address);
  function safeTransferFrom(address, address, uint256) public;
}

// @nico TODO: Standalone Storage.
// @nico TODO: Clean update operator on transfer.


/**
 * @title ERC721 registry of every minted estate and their owned LANDs
 */
contract EstateRegistry is ERC721Token, Ownable, MetadataHolderBase, IEstateRegistry {
  using SafeMath for uint256;

  LandRegistry public registry;

  // From Estate to list of owned land ids (LANDs)
  mapping(uint256 => uint256[]) public estateLandIds;

  // From Land id (LAND) to its owner Estate id
  mapping(uint256 => uint256) public landIdEstate;

  // From Estate id to mapping of land id to index on the array above (estateLandIds)
  mapping(uint256 => mapping(uint256 => uint256)) public estateLandIndex;

  // Metadata of the Estate
  mapping(uint256 => string) internal estateData;

  // Operator of the Estate
  mapping (uint256 => address) internal updateOperator;

  // Secuential Estate id
  uint256 internal currentEstateId;

  constructor(
    string _name,
    string _symbol,
    address _registry
  )
    ERC721Token(_name, _symbol)
    Ownable()
    public
  {
    require(_registry != 0, "The registry should be a valid address");
    registry = LandRegistry(_registry);
  }

  modifier onlyDAR() {
    require(msg.sender == address(registry), "Only the registry can make this operation");
    _;
  }

  modifier onlyUpdateAuthorized(uint256 estateId) {
    require(_isUpdateAuthorized(msg.sender, estateId), "Unauthorized user");
    _;
  }

  /**
   * @dev Mint a new Estate
   * @param to The address that will own the minted token
   * @return An uint256 representing the new token id
   */
  function mint(address to) external returns (uint256) {
    uint256 estateId = _getNewEstateId();
    _mint(to, estateId);
    return estateId;
  }

  /**
   * @notice Handle the receipt of an NFT
   * @dev The ERC721 smart contract calls this function on the recipient
   *  after a `safetransfer`. This function MAY throw to revert and reject the
   *  transfer. The EstateRegistry uses this function to register new tokens for a particular estate
   *  which will be present on the extra bytes.
   * @param tokenId The NFT identifier which is being transfered
   * @param estateTokenIdBytes Additional data, should represent a uint256 estate id
   * @return `bytes4(keccak256("onERC721Received(address,uint256,bytes)"))`
   */
  function onERC721Received(
    address /* oldOwner */,
    uint256 tokenId,
    bytes estateTokenIdBytes
  )
    external
    onlyDAR
    returns (bytes4)
  {
    uint256 estateId = _bytesToUint(estateTokenIdBytes);
    _pushLandId(estateId, tokenId);
    return bytes4(0xf0b9e5ba);
  }

  /**
   * @notice Unlock any token sent to the contract without using safeTransferFrom
   * @dev It uses the same logic as onERC721Received
   * @param estateId The new owner of the locked token
   * @param landId Locked Land id
   */
  function ammendReceived(uint256 estateId, uint256 landId) external {
    _pushLandId(estateId, landId);
    emit AmmendReceived(estateId, landId);
  }

  /**
   * @notice Transfer a land owned by a estate to a new owner
   * @param estateId Current owner of the token
   * @param landId Land to be transfered
   * @param destinatary New owner
   */
  function transferLand(
    uint256 estateId,
    uint256 landId,
    address destinatary
  )
    external
    canTransfer(estateId)
  {
    return _transferLand(estateId, landId, destinatary);
  }

  /**
   * @notice Transfer many tokens owned by a estate to a new owner
   * @param estateId Current owner of the token
   * @param landIds Lands to be transfered
   * @param destinatary New owner
   */
  function transferManyLands(
    uint256 estateId,
    uint256[] landIds,
    address destinatary
  )
    external
    canTransfer(estateId)
  {
    uint length = landIds.length;
    for (uint i = 0; i < length; i++) {
      _transferLand(estateId, landIds[i], destinatary);
    }
  }

  /**
   * @notice Get the estate id for a given land id
   * @dev This information also lives on estateLandIds,
   *   but it being a mapping you need to know the estate id beforehand.
   * @param landId Land to search
   * @return The corresponding estate id
   */
  function getLandEstateId(uint256 landId) external view returns (uint256) {
    return landIdEstate[landId];
  }

  function setLandRegistry(address _registry) external onlyOwner {
    require(_registry != 0, "The land registry address should be valid");
    registry = LandRegistry(_registry);
    emit SetPingableDAR(registry);
  }

  function ping() external onlyOwner {
    registry.ping();
  }

  /**
   * @notice Return the amount of tokens for a given estate
   * @param estateId Estate id to search
   * @return Tokens length
   */
  function getEstateSize(uint256 estateId) external view returns (uint256) {
    return estateLandIds[estateId].length;
  }

  function updateMetadata(
    uint256 estateId,
    string metadata
  )
    external
    onlyUpdateAuthorized(estateId)
  {
    estateData[estateId] = metadata;

    emit Update(
      estateId,
      ownerOf(estateId),
      msg.sender,
      metadata
    );
  }

  function getMetadata(uint256 estateId) external view returns (string) {
    return estateData[estateId];
  }

  function setUpdateOperator(uint256 estateId, address operator) external canTransfer(estateId) {
    updateOperator[estateId] = operator;
    emit UpdateOperator(estateId, operator);
  }

  function isUpdateAuthorized(address operator, uint256 estateId) external view returns (bool) {
    return _isUpdateAuthorized(operator, estateId);
  }

  /**
   * @notice Return a new unique id
   * @dev Secuential starting from 1
   * @return uint256 Representing the new Estate id
   */
  function _getNewEstateId() internal returns (uint256) {
    currentEstateId = currentEstateId.add(1);
    return currentEstateId;
  }

  /**
   * @dev Appends a new Land id to a esatate updating all related storage
   * @param estateId Estate where the Land should go
   * @param landId Transfered Land
   */
  function _pushLandId(uint256 estateId, uint256 landId) internal {
    require(exists(estateId), "The estate id should exist");
    require(estateLandIndex[estateId][landId] == 0, "The land is already owned by the estate");
    require(registry.ownerOf(landId) == address(this), "The Estate Registry cant manage this land");

    estateLandIds[estateId].push(landId);

    landIdEstate[landId] = estateId;

    estateLandIndex[estateId][landId] = estateLandIds[estateId].length;
  }

  /**
   * @dev Removes a Land from an estate and transfers it to a new owner
   * @param estateId Current owner of the Land
   * @param landId Land to be transfered
   * @param destinatary New owner
   */
  function _transferLand(
    uint256 estateId,
    uint256 landId,
    address destinatary
  )
    internal
  {
    uint256[] storage landIds = estateLandIds[estateId];
    mapping(uint256 => uint256) landIndex = estateLandIndex[estateId];

    /**
     * Using 1-based indexing to be able to make this check
     */
    require(landIndex[landId] != 0, "The land is already owned by the estate");

    uint lastIndexInArray = landIds.length - 1;

    /**
     * Get the landIndex of this token in the landIds list
     */
    uint indexInArray = landIndex[landId] - 1;

    /**
     * Get the landId at the end of the landIds list
     */
    uint tempTokenId = landIds[lastIndexInArray];

    /**
     * Store the last token in the position previously occupied by landId
     */
    landIndex[tempTokenId] = indexInArray + 1;
    landIds[indexInArray] = tempTokenId;

    /**
     * Delete the landIds[last element]
     */
    delete landIds[lastIndexInArray];
    landIds.length = lastIndexInArray;

    /**
     * Drop this landId from both the landIndex and landId list
     */
    landIndex[landId] = 0;

    /**
     * Drop this landId estate
     */
    landIdEstate[landId] = 0;

    registry.safeTransferFrom(this, destinatary, landId);
  }

  function _isUpdateAuthorized(address operator, uint256 estateId) internal view returns (bool) {
    return isApprovedOrOwner(operator, estateId) || updateOperator[estateId] == operator;
  }

  function _bytesToUint(bytes b) internal pure returns (uint256) {
    bytes32 out;

    for (uint i = 0; i < b.length; i++) {
      out |= bytes32(b[i] & 0xFF) >> (i * 8);
    }

    return uint256(out);
  }
}
