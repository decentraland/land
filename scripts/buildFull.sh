#! /bin/bash

REGISTRY=LANDRegistry.sol
PROXY=LANDProxy.sol
ESTATE_REGISTRY=EstateRegistry.sol


OUTPUT=full

npx truffle-flattener contracts/land/$REGISTRY > $OUTPUT/$REGISTRY
npx truffle-flattener contracts/upgradable/$PROXY > $OUTPUT/$PROXY
npx truffle-flattener contracts/estate/$ESTATE_REGISTRY > $OUTPUT/$ESTATE_REGISTRY

