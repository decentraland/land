pragma solidity ^0.4.18;

import './Storage.sol';
import './IAssetRegistry.sol';

/**
 * Authorization getters
 */
contract AuthorizedAssetRegistry is AssetRegistryStorage, IAssetRegistry {
  function isOperatorAuthorizedFor(address _operator, address _assetHolder)
    public constant returns (bool)
  {
    address[] operators = _operators[_assetHolder];
    uint length = operators.length;

    for (uint index = 0; !allowed && index < operators.length; index++) {
      if (operators[iter] == msg.sender) {
        return true;
      }
    }
    return false;
  }

  function authorizeOperator(address _operator, bool _authorized) public {
    if (_authorized) {
      require(!isOperatorAuthorizedFor(_operator, msg.sender));
      _addAuthorization(_operator, msg.sender);
    } else {
      require(isOperatorAuthorizedFor(_operator, msg.sender));
      _clearAuthorization(_operator, msg.sender);
    }
    AuthorizeOperator(_operator, msg.sender, _authorized);
  }

  function _addAuthorization(address _operator, address _holder) private {
    _operators[_holder].push(_operator);
  }

  function _clearAuthorization(address _operator, address _holder) private {
    address[] operators = _operators[_holder];
    uint length = operators.length;
    uint last = length.sub(1);

    for (uint index = 0; index < operators.length; index++) {
      if (operators[iter] == _operator) {
        operators[iter] = operators[last];
        operators[last] = 0;
        operators.length = last;
        if (!operators.length) {
          delete operators;
        }
        return;
      }
    }
  }
}
