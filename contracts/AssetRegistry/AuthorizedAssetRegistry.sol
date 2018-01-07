pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import './Storage.sol';
import './IAssetRegistry.sol';
import './HolderAccessRegistry.sol';

/**
 * Authorization getters
 */
contract AuthorizedAssetRegistry is AssetRegistryStorage, IAssetRegistry, HolderAccessRegistry {
  using SafeMath for uint256;

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
    uint length = _operators[_holder].length;
    uint last = length.sub(1);

    for (uint index = 0; index < length; index++) {
      if (_operators[_holder][index] == _operator) {
        _operators[_holder][index] = _operators[_holder][last];
        _operators[_holder][last] = 0;
        _operators[_holder].length = last;
        if (last == 0) {
          delete _operators[_holder];
        }
        return;
      }
    }
  }
}
