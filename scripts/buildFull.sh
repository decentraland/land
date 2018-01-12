#! /bin/bash

REGISTRY=LANDRegistry.sol
PROXY=LANDProxy.sol

OUTPUT=full

truffle-flattener contracts/land/$REGISTRY > $OUTPUT/$REGISTRY
truffle-flattener contracts/upgradable/$PROXY > $OUTPUT/$PROXY
