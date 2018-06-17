pragma solidity ^0.4.23;

import './EstateOwner.sol';
import './IEstateFactory.sol';

contract EstateFactory is IEstateFactory {

    event EstateCreated(
        address indexed estate,
        address indexed dar,
        address indexed beneficiary
    );

    function buildEstate(address dar, address beneficiary) external returns (address) {
        EstateOwner estate = new EstateOwner(
            dar,
            beneficiary
        );
        emit EstateCreated(address(estate), dar, beneficiary);
        return address(estate);
    }
}
