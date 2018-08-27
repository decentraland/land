pragma solidity ^0.4.23;

import "openzeppelin-zos/contracts/token/ERC721/ERC721Token.sol";
import "openzeppelin-zos/contracts/ownership/Ownable.sol";
import "zos-lib/contracts/migrations/Migratable.sol";

import "./IEstateRegistry.sol";
import "./EstateStorage.sol";
import "../metadata/MetadataHolderBase.sol";


/**
 * @title ERC721 registry of every minted Estate and their owned LANDs
 * @dev Usings we are inheriting and depending on:
 * From ERC721Token:
 *   - using SafeMath for uint256;
 *   - using AddressUtils for address;
 */
// solium-disable-next-line max-len
contract EstateRegistry is Migratable, ERC721Token, Ownable, MetadataHolderBase, IEstateRegistry, EstateStorage {
  modifier canTransfer(uint256 estateId) {
    require(isApprovedOrOwner(msg.sender, estateId), "Only owner or operator can transfer");
    _;
  }

  modifier onlyRegistry() {
    require(msg.sender == address(registry), "Only the registry can make this operation");
    _;
  }

  modifier onlyUpdateAuthorized(uint256 estateId) {
    require(_isUpdateAuthorized(msg.sender, estateId), "Unauthorized user");
    _;
  }

  /**
   * @dev Mint a new Estate with some metadata
   * @param to The address that will own the minted token
   * @param metadata Set an initial metadata
   * @return An uint256 representing the new token id
   */
  function mint(address to, string metadata) external onlyRegistry returns (uint256) {
    return _mintEstate(to, metadata);
  }

  /**
   * @notice Handle the receipt of an NFT
   * @dev The ERC721 smart contract calls this function on the recipient
   *  after a `safetransfer`. This function MAY throw to revert and reject the
   *  transfer. The EstateRegistry uses this function to register new tokens for a particular Estate
   *  which will be present on the extra bytes.
   * @param tokenId The NFT identifier which is being transfered
   * @param estateTokenIdBytes Additional data, should represent a uint256 Estate id
   * @return `bytes4(keccak256("onERC721Received(address,uint256,bytes)"))`
   */
  function onERC721Received(
    address /* oldOwner */,
    uint256 tokenId,
    bytes estateTokenIdBytes
  )
    external
    onlyRegistry
    returns (bytes4)
  {
    uint256 estateId = _bytesToUint(estateTokenIdBytes);
    _pushLandId(estateId, tokenId);
    return bytes4(0xf0b9e5ba);
  }

  /**
   * @notice Transfer a LAND owned by an Estate to a new owner
   * @param estateId Current owner of the token
   * @param landId LAND to be transfered
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
   * @notice Transfer many tokens owned by an Estate to a new owner
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
   * @notice Get the Estate id for a given LAND id
   * @dev This information also lives on estateLandIds,
   *   but it being a mapping you need to know the Estate id beforehand.
   * @param landId LAND to search
   * @return The corresponding Estate id
   */
  function getLandEstateId(uint256 landId) external view returns (uint256) {
    return landIdEstate[landId];
  }

  function setLANDRegistry(address _registry) external onlyOwner {
    require(_registry.isContract(), "The LAND registry address should be a contract");
    require(_registry != 0, "The LAND registry address should be valid");
    registry = LANDRegistry(_registry);
    emit SetLANDRegistry(registry);
  }

  function ping() external {
    registry.ping();
  }

  /**
   * @notice Return the amount of tokens for a given Estate
   * @param estateId Estate id to search
   * @return Tokens length
   */
  function getEstateSize(uint256 estateId) external view returns (uint256) {
    return estateLandIds[estateId].length;
  }

  /**
   * @notice Update the metadata of an Estate
   * @dev Reverts if the Estate does not exist or the user is not authorized
   * @param estateId Estate id to update
   * @param metadata string metadata
   */
  function updateMetadata(
    uint256 estateId,
    string metadata
  )
    external
    onlyUpdateAuthorized(estateId)
  {
    _updateMetadata(estateId, metadata);

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

  function initialize(
    string _name,
    string _symbol,
    address _registry
  )
    public
    isInitializer("EstateRegistry", "0.0.1")
  {
    require(_registry != 0, "The registry should be a valid address");
    ERC721Token.initialize(_name, _symbol);
    Ownable.initialize(msg.sender);
    registry = LANDRegistry(_registry);
  }

  /**
   * @dev Safely transfers the ownership of multiple Estate IDs to another address
   * @dev Delegates to safeTransferFrom for each transfer
   * @dev Requires the msg sender to be the owner, approved, or operator
   * @param from current owner of the token
   * @param to address to receive the ownership of the given token ID
   * @param estateIds uint256 array of IDs to be transferred
  */
  function safeTransferManyFrom(address from, address to, uint256[] estateIds) public {
    safeTransferManyFrom(
      from,
      to,
      estateIds,
      ""
    );
  }

  /**
   * @dev Safely transfers the ownership of multiple Estate IDs to another address
   * @dev Delegates to safeTransferFrom for each transfer
   * @dev Requires the msg sender to be the owner, approved, or operator
   * @param from current owner of the token
   * @param to address to receive the ownership of the given token ID
   * @param estateIds uint256 array of IDs to be transferred
   * @param data bytes data to send along with a safe transfer check
  */
  function safeTransferManyFrom(
    address from,
    address to,
    uint256[] estateIds,
    bytes data
  )
    public
  {
    for (uint i = 0; i < estateIds.length; i++) {
      safeTransferFrom(
        from,
        to,
        estateIds[i],
        data
      );
    }
  }

  /**
   * @dev Internal function to mint a new Estate with some metadata
   * @param to The address that will own the minted token
   * @param metadata Set an initial metadata
   * @return An uint256 representing the new token id
   */
  function _mintEstate(address to, string metadata) internal returns (uint256) {
    require(to != address(0), "You can not mint to an empty address");
    uint256 estateId = _getNewEstateId();
    _mint(to, estateId);
    _updateMetadata(estateId, metadata);
    emit CreateEstate(to, estateId, metadata);
    return estateId;
  }

  /**
   * @dev Internal function to update an Estate metadata
   * @dev Does not require the Estate to exist, for a public interface use `updateMetadata`
   * @param estateId Estate id to update
   * @param metadata string metadata
   */
  function _updateMetadata(uint256 estateId, string metadata) internal {
    estateData[estateId] = metadata;
  }

  /**
   * @notice Return a new unique id
   * @dev It uses totalSupply to determine the next id
   * @return uint256 Representing the new Estate id
   */
  function _getNewEstateId() internal view returns (uint256) {
    return totalSupply().add(1);
  }

  /**
   * @dev Appends a new LAND id to an Estate updating all related storage
   * @param estateId Estate where the LAND should go
   * @param landId Transfered LAND
   */
  function _pushLandId(uint256 estateId, uint256 landId) internal {
    require(exists(estateId), "The Estate id should exist");
    require(landIdEstate[landId] == 0, "The LAND is already owned by an Estate");
    require(registry.ownerOf(landId) == address(this), "The Estate Registry cannot manage this LAND");

    estateLandIds[estateId].push(landId);

    landIdEstate[landId] = estateId;

    estateLandIndex[estateId][landId] = estateLandIds[estateId].length;

    emit AddLand(estateId, landId);
  }

  /**
   * @dev Removes a LAND from an Estate and transfers it to a new owner
   * @param estateId Current owner of the LAND
   * @param landId LAND to be transfered
   * @param destinatary New owner
   */
  function _transferLand(
    uint256 estateId,
    uint256 landId,
    address destinatary
  )
    internal
  {
    require(destinatary != address(0), "You can not transfer LAND to an empty address");

    uint256[] storage landIds = estateLandIds[estateId];
    mapping(uint256 => uint256) landIndex = estateLandIndex[estateId];

    /**
     * Using 1-based indexing to be able to make this check
     */
    require(landIndex[landId] != 0, "The LAND is already owned by the Estate");

    uint lastIndexInArray = landIds.length.sub(1);

    /**
     * Get the landIndex of this token in the landIds list
     */
    uint indexInArray = landIndex[landId].sub(1);

    /**
     * Get the landId at the end of the landIds list
     */
    uint tempTokenId = landIds[lastIndexInArray];

    /**
     * Store the last token in the position previously occupied by landId
     */
    landIndex[tempTokenId] = indexInArray.add(1);
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
     * Drop this landId Estate
     */
    landIdEstate[landId] = 0;

    registry.safeTransferFrom(this, destinatary, landId);

    emit RemoveLand(estateId, landId, destinatary);
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
