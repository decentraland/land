contract LANDStorage is AssetRegistryStorage {

  address owner;

  mapping (address => uint) latestPing;

}
