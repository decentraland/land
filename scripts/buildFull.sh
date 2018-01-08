#! /bin/bash

REGISTRY=LANDRegistry.sol
PROXY=LANDProxy.sol

OUTPUT=full

truffle-flattener contracts/Land/$REGISTRY > $OUTPUT/$REGISTRY
truffle-flattener contracts/Upgradable/$PROXY > $OUTPUT/$PROXY
