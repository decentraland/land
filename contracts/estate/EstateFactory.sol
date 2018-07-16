pragma solidity ^0.4.23;

import './EstateRegistry.sol';
import './IEstateFactory.sol';

contract EstateFactory is IEstateFactory {

    event EstateCreated(
        address indexed estate,
        address indexed dar,
        address indexed beneficiary
    );

    function buildEstate(address dar, address beneficiary) external returns (address) {
        // @nico TODO: Revise this
        EstateRegistry estate = new EstateRegistry(
            'Estate',
            'EST',
            dar,
            beneficiary
        );
        emit EstateCreated(address(estate), dar, beneficiary);
        return address(estate);
    }
}
