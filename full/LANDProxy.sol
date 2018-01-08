pragma solidity ^0.4.18;

// File: contracts/AssetRegistry/Storage.sol

contract AssetRegistryStorage {

  string internal _name;
  string internal _symbol;
  string internal _description;

  /**
   * Stores the total count of assets managed by this registry
   */
  uint256 internal _count;

  /**
   * Stores an array of assets owned by a given account
   */
  mapping(address => uint256[]) internal _assetsOf;

  /**
   * Stores the current holder of an asset
   */
  mapping(uint256 => address) internal _holderOf;

  /**
   * Stores the index of an asset in the `_assetsOf` array of its holder
   */
  mapping(uint256 => uint256) internal _indexOfAsset;

  /**
   * Stores the data associated with an asset
   */
  mapping(uint256 => string) internal _assetData;

  /**
   * For a given account, for a given opperator, store whether that operator is
   * allowed to transfer and modify assets on behalf of them.
   */
  mapping(address => mapping(address => bool)) internal _operators;

  /**
   * Simple reentrancy lock
   */
  bool internal _reentrancy;
}

// File: contracts/Upgradable/OwnableStorage.sol

contract OwnableStorage {
  address public owner;

  function OwnableStorage() {
    owner = msg.sender;
  }
}

// File: contracts/Land/LANDStorage.sol

contract LANDStorage is OwnableStorage, AssetRegistryStorage {

  mapping (address => uint) latestPing;

}

// File: contracts/Upgradable/DelegateProxy.sol

contract DelegateProxy {
  /**
   * @dev Performs a delegatecall and returns whatever the delegatecall returned (entire context execution will return!)
   * @param _dst Destination address to perform the delegatecall
   * @param _calldata Calldata for the delegatecall
   */
  function delegatedFwd(address _dst, bytes _calldata) internal {
    require(isContract(_dst));
    assembly {
      let result := delegatecall(sub(gas, 10000), _dst, add(_calldata, 0x20), mload(_calldata), 0, 0)
      let size := returndatasize

      let ptr := mload(0x40)
      returndatacopy(ptr, 0, size)

      // revert instead of invalid() bc if the underlying call failed with invalid() it already wasted gas.
      // if the call returned error data, forward it
      switch result case 0 { revert(ptr, size) }
      default { return(ptr, size) }
    }
  }

  function isContract(address _target) constant internal returns (bool) {
    uint256 size;
    assembly { size := extcodesize(_target) }
    return size > 0;
  }
}

// File: contracts/Upgradable/IApplication.sol

contract IApplication {
  function initialize(bytes data) public;
}

// File: contracts/Upgradable/Ownable.sol

contract Ownable is OwnableStorage, IApplication {

  event OwnerUpdate(address _prevOwner, address _newOwner);

  function initialize(bytes) public {
    owner = msg.sender;
  }

  modifier onlyOwner {
    assert(msg.sender == owner);
    _;
  }

  function transferOwnership(address _newOwner) public onlyOwner {
    require(_newOwner != owner);
    owner = _newOwner;
  }
}

// File: contracts/Upgradable/Proxy.sol

contract Proxy is Ownable, DelegateProxy {
  /**
   * Current contract to which we are proxing
   */
  address currentContract;

  function initialize() onlyOwner public {
    // Prevent calls to initialize
    require(false);
  }

  function initialize(bytes) onlyOwner public {
    // Prevent calls to initialize
    require(false);
  }

  function upgrade(IApplication newContract, bytes data) onlyOwner public {
    currentContract = newContract;
    newContract.initialize(data);
  }

  function () payable public {
    require(currentContract != 0); // if app code hasn't been set yet, don't call
    delegatedFwd(currentContract, msg.data);
  }
}

// File: contracts/Upgradable/LANDProxy.sol

contract LANDProxy is LANDStorage, Proxy {
}
