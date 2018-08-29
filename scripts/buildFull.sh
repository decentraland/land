#! /bin/bash

REGISTRY=LANDRegistry.sol
PROXY=LANDProxy.sol
ESTATE_REGISTRY=EstateRegistry.sol


OUTPUT=full

truffle-flattener contracts/land/$REGISTRY > $OUTPUT/$REGISTRY
truffle-flattener contracts/upgradable/$PROXY > $OUTPUT/$PROXY
truffle-flattener contracts/estate/$ESTATE_REGISTRY > $OUTPUT/$ESTATE_REGISTRY

