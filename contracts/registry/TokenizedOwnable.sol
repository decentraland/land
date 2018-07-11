pragma solidity ^0.4.23;

import 'erc821/contracts/IERC721Base.sol';

contract TokenizedOwnable {

    IERC721Base public dar;

    mapping(address => address[]) indirectOwnership;

    modifier onlyDar() {
        require(msg.sender == address(dar));
        _;
    }

    function registerOwner(address owner, address holder) public onlyDar {
        indirectOwnership[owner].push(holder);
    }
}
