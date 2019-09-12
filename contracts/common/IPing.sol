pragma solidity ^0.4.18;

interface IPing {
  // LAND Ping
  function ping(address _user) external;
  function ping() external;
  function setGracePeriod(uint256 _gracePeriod) external;
  function setDeemPeriod(uint256 _deemPeriod) external;
  function hasDecayed(uint256 _tokenId) external view returns (bool);

  // Events
  event Ping(
    address indexed _user
  );

  event GracePeriod(
    address indexed _caller,
    uint256 indexed _gracePeriod
  );

  event DeemPeriod(
    address indexed _caller,
    uint256 indexed _deemPeriod
  );
}
