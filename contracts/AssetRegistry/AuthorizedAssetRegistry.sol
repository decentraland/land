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
    _operators[_holder][_operator] = true;
  }

  function _clearAuthorization(address _operator, address _holder) private {
    _operators[_holder][_operator] = false;
  }
}
