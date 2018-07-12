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
        // @nico TODO: Revise this
        EstateOwner estate = new EstateOwner(
            'Estate',
            'EST',
            dar,
            beneficiary
        );
        emit EstateCreated(address(estate), dar, beneficiary);
        return address(estate);
    }
}
