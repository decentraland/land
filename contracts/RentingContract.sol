pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

import 'zeppelin-solidity/contracts/math/Math.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import './LANDToken.sol';

contract RentingContract is Ownable {
    using SafeMath
    for uint256;

    // Land contract for Decentraland
    LANDToken public landContract;

    uint256 public upfrontCost;
    uint256 public ownerTerminationCost;
    uint256 public weeklyCost;
    uint256 public costPerSecond;

    address public tenant;
    uint256 public rentStartedAt;
    uint256 public tenantBalance;

    function RentingContract(LANDToken _landContract, uint256 _upfrontCost, uint256 _ownerTerminationCost, uint256 _weeklyCost) public {
        require(address(_landContract) != 0);
        landContract = _landContract;

        upfrontCost = _upfrontCost;
        weeklyCost = _weeklyCost;
        ownerTerminationCost = _ownerTerminationCost;
        costPerSecond = weeklyCost / 1 weeks;
    }

    function totalDue(uint256 time) public constant returns(uint256) {
        return time.sub(rentStartedAt).mul(costPerSecond).add(upfrontCost);
    }

    function totalDueSoFar() public constant returns(uint256) {
        return totalDue(now);
    }

    function isRented() public constant returns(bool) {
        return tenant != 0;
    }

    function isDue() public constant returns(bool) {
        return isRented() && totalDueSoFar() >= tenantBalance;
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
        require(msg.sender == tenant || msg.sender == owner);
        _;
    }

    /**
     * Allow someone to rent the land
     */
    function rent() public payable onlyIfNotRented {
        uint256 paid = msg.value;
        // require 1 week in advance
        require(totalDue(now + 1 weeks) >= upfrontCost.add(weeklyCost));

        tenant = msg.sender;
        rentStartedAt = now;
        tenantBalance = paid;
    }

    /**
     * Allow someone to rent the land
     */
    function payRent() public payable onlyIfRented {
        uint256 paid = msg.value;
        tenantBalance = tenantBalance.add(paid);
    }

    function evict() public returns(bool) {
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
        upfrontCost = 0;
        weeklyCost = 0;
        ownerTerminationCost = 0;
        costPerSecond = 0;
    }

    function ChangePricing(
        uint256 _upfrontCost,
        uint256 _weeklyCost,
        uint256 _ownerTerminationCost,
        uint256 _costPerSecond
    )
    public
    onlyOwner
    onlyIfNotRented 
    {
        upfrontCost = _upfrontCost;
        weeklyCost = _weeklyCost;
        ownerTerminationCost = _ownerTerminationCost;
        costPerSecond = _costPerSecond;
    }


    function cancelContract() payable public onlyOwner onlyIfRented {
        require(msg.value >= ownerTerminationCost);
        _release();
        tenant.transfer(msg.value);
    }

    function transfer(address target, uint256 tokenId) public onlyOwner onlyIfNotRented {
        //_clear(); not sure why this is needed for this new version
        landContract.transfer(target, tokenId);
    }

    function retrieveFunds() public onlyOwner {
        owner.transfer(this.balance);
    }

    function updateLandForOwner(string _metadata, uint256 tokenId) public onlyOwner onlyIfNotRented {
        landContract.updateTokenMetadata(tokenId, _metadata);
    }

    function updateLand(string _metadata, uint256 tokenId) public onlyTenant onlyIfRented {
        landContract.updateTokenMetadata(tokenId, _metadata);
    }

    function pingLand(uint256 tokenId) public onlyTenantOrOwner {
        landContract.ping(tokenId);
    }
    
    function selfDestruct(uint256[] lands) public onlyOwner onlyIfNotRented {
        for(uint256 i = 0; i < lands.length; i++) {
            transfer(owner, lands[i]); //get rid of lands 
        }
        selfdestruct(owner);
    }
}
