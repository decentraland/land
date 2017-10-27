pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

import 'zeppelin-solidity/contracts/math/Math.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import './Land.sol';

contract RentingContract is Ownable{
    using SafeMath for uint256;

    // Coordinates to locate the land
    uint256 public x;
    uint256 public y;
    uint256 public tokenId;

    // Land contract for Decentraland
    Land public landContract = Land(0x0);

    uint256 public upfrontCost;
    uint256 public ownerTerminationCost;
    uint256 public weeklyCost;
    uint256 public costPerSecond;

    address public tenant;
    uint256 public rentStartedAt;
    uint256 public tenantBalance;

    function RentingContract()
    {
        require(landContract != 0);
    }

    function initRentContract(
      uint256 _x,
      uint256 _y,
      uint256 _upfrontCost,
      uint256 _ownerTerminationCost,
      uint256 _weeklyCost
    )
      public
      onlyOwner
      onlyIfNotRented
      returns (bool)
    {
        tokenId = landContract.buildTokenId(x, y);
        x = _x;
        y = _y;
        upfrontCost = _upfrontCost;
        weeklyCost = _weeklyCost;
        ownerTerminationCost = _ownerTerminationCost;
        costPerSecond = weeklyCost / 1 weeks;

        require(landContract.ownerOf(tokenId) == address(this));
        
        return true
    }

    function isSetup() public returns(bool) {
        // We use tokenId = 0 to signify that the contract has not been setup yet
        return tokenId != 0;
    }

    function totalDue(uint256 time) returns (uint256) {
        return time.sub(rentStartedAt).mul(costPerSecond).sum(upfrontCost);
    }

    function totalDueSoFar() returns (uint256) {
        return totalDue(now);
    }

    function isRented() public returns(bool) {
        return tenant != 0;
    }

    function isDue() public {
        return isRented() && totalDueSoFar() >= tenantBalance;
    }

    modifier onlyIfSetup {
        require(isSetup());
        _;
    }

    modifier onlyIfRented {
        require(isRented());
        _;
    }

    modifier onlyIfNotRented {
        require(!isRented());
        _;
    }

    modifier onlyTenant {
        require(msg.sender == tenant);
        _;
    }
    
    modifier onlyTenantOrOwner {
        require(msg.sender == tenant || msg.sender == );
        _;
    }

    /**
     * Allow someone to rent the land
     */
    function rent() payable onlyIfSetup onlyIfNotRented {
        uint256 paid = msg.value;
        // require 1 week in advance
        require(totalDue(now + 1 weeks) >= upfrontCost.sum(weeklyCost));

        tenant = msg.sender;
        rentStartedAt = now;
        tenantBalance = paid;
    }

    /**
     * Allow someone to rent the land
     */
    function payRent() payable onlyIfRented {
        uint256 paid = msg.value;
        tenantBalance = tenantBalance.sum(paid);
    }

    function evict() public returns (bool) {
        if (isDue()) {
            _release();
            return true;
        }
        return false;
    }

    function _release() internal {
        tenant = 0;
        tenantBalance = 0;
        rentStartedAt = 0;
    }

    function _clear() internal {
        tokenId = 0;
        x = 0;
        y = 0;
        upfrontCost = 0;
        weeklyCost = 0;
        ownerTerminationCost = 0;
        costPerSecond = 0;
    }

    function cancelContract() payable public onlyOwner onlyIfRented {
        require(msg.value >= ownerTerminationCost);
        _release();
        tenant.send(msg.value);
    }

    function transfer(address target) public onlyOwner onlyIfNotRented {
        _clear();
        land.transfer(target, tokenId);
    }

    function retrieveFunds() public onlyOwner {
        owner.send(this.balance);
    }

    function updateLandForOwner(string _metadata) public onlyOwner onlyIfNotRented {
        updateTokenMetadata(land, _metadata);
    }

    function updateLand(string _metadata) public onlyTenant onlyIfRented {
        updateTokenMetadata(land, _metadata);
    }
    
    function PingLand() public onlyTenantOrOwner {
        landContract.ping(tokenId);
    }
}
