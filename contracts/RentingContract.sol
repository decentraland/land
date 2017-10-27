pragma solidity ^0.4.15;

import './Land.sol';
import "Ownable.sol";

contract RentingContract is Ownable{
    uint256 land;
    
    uint land_x;
    uint land_y;
    
    Land L = Land(0x0); //put land contract address here
    address tenant;
    
    bool Setup = false;
    bool IsVacent = true;
    
    uint UpFrontCost;
    uint CostPerWeek;
    
    uint lastpayed;
    
    function RentingContract(uint PUpFrontCost, uint PCostPerWeek)
    {
        UpFrontCost = PUpFrontCost;
        CostPerWeek = PCostPerWeek;
    }
    
    function InitRentContract(uint x, uint y) returns bool
    {
        land = L.buildTokenId(x, y);
        land_x = x;
        land_y = y;
        
        if(L.ownerOfLand(x,y) == address(this))
        {
            Setup = true;
        }
        return false
    }
    
    function FillVacancy() payable{
        if(msg.value >= UpFrontCost)
        {
            tenant = msg.sender;
            IsVacent = false;
            lastpayed = now;
        }
    }
    
    function Evict() onlyOwner
    {        
        if(lastpayed + 1 week < now)
        {
            IsVacent = true;
            tenant = address(0);
        }
    }
    
    function PayRent() payable {
        if(msg.value >= CostPerWeek)
        {
            lastpayed = now;
        }
    }
    
    function Reclaim() onlyOwner {
        if(!IsVacent)
            return;
        
        L.transferLand(Owner, land_x, land_y);
        suicide(owner);
    }
    
    function ClaimFunds() onlyOwner {
        owner.send(this.balance)
    }
    
    function EditLand(string _metadata) {
        if(msg.sender == tenant)
            updateTokenMetadata(land, _metadata);
    }
}
