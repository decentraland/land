pragma solidity ^0.4.13;

contract Ownable {
  address public owner;


  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  function Ownable() {
    owner = msg.sender;
  }


  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }


  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) onlyOwner public {
    require(newOwner != address(0));
    OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

}

contract NFT {
  function totalSupply() constant returns (uint);
  function balanceOf(address) constant returns (uint);

  function tokenOfOwnerByIndex(address owner, uint index) constant returns (uint);
  function ownerOf(uint tokenId) constant returns (address);

  function transfer(address to, uint tokenId);
  function takeOwnership(uint tokenId);
  function transferFrom(address from, address to, uint tokenId);
  function approve(address beneficiary, uint tokenId);

  function metadata(uint tokenId) constant returns (string);
}

contract NFTEvents {
  event Created(uint tokenId, address owner, string metadata);
  event Destroyed(uint tokenId, address owner);

  event Transferred(uint tokenId, address from, address to);
  event Approval(address owner, address beneficiary, uint tokenId);

  event MetadataUpdated(uint tokenId, address owner, string data);
}

contract BasicNFT is NFT, NFTEvents {

  uint public totalTokens;

  // Array of owned tokens for a user
  mapping(address => uint[]) public ownedTokens;
  mapping(address => uint) _virtualLength;
  mapping(uint => uint) _tokenIndexInOwnerArray;

  // Mapping from token ID to owner
  mapping(uint => address) public tokenOwner;

  // Allowed transfers for a token (only one at a time)
  mapping(uint => address) public allowedTransfer;

  // Metadata associated with each token
  mapping(uint => string) public tokenMetadata;

  function totalSupply() public constant returns (uint) {
    return totalTokens;
  }

  function balanceOf(address owner) public constant returns (uint) {
    return _virtualLength[owner];
  }

  function tokenOfOwnerByIndex(address owner, uint index) public constant returns (uint) {
    require(index >= 0 && index < balanceOf(owner));
    return ownedTokens[owner][index];
  }

  function getAllTokens(address owner) public constant returns (uint[]) {
    uint size = _virtualLength[owner];
    uint[] memory result = new uint[](size);
    for (uint i = 0; i < size; i++) {
      result[i] = ownedTokens[owner][i];
    }
    return result;
  }

  function ownerOf(uint tokenId) public constant returns (address) {
    return tokenOwner[tokenId];
  }

  function transfer(address to, uint tokenId) public {
    require(tokenOwner[tokenId] == msg.sender || allowedTransfer[tokenId] == msg.sender);
    return _transfer(tokenOwner[tokenId], to, tokenId);
  }

  function takeOwnership(uint tokenId) public {
    require(allowedTransfer[tokenId] == msg.sender);
    return _transfer(tokenOwner[tokenId], msg.sender, tokenId);
  }

  function transferFrom(address from, address to, uint tokenId) public {
    require(allowedTransfer[tokenId] == msg.sender);
    return _transfer(tokenOwner[tokenId], to, tokenId);
  }

  function approve(address beneficiary, uint tokenId) public {
    require(msg.sender == tokenOwner[tokenId]);

    if (allowedTransfer[tokenId] != 0) {
      allowedTransfer[tokenId] = 0;
    }
    allowedTransfer[tokenId] = beneficiary;
    Approval(tokenOwner[tokenId], beneficiary, tokenId);
  }

  function metadata(uint tokenId) constant public returns (string) {
    return tokenMetadata[tokenId];
  }

  function updateTokenMetadata(uint tokenId, string _metadata) public {
    require(msg.sender == tokenOwner[tokenId]);
    tokenMetadata[tokenId] = _metadata;
    MetadataUpdated(tokenId, msg.sender, _metadata);
  }

  function _transfer(address from, address to, uint tokenId) internal {
    _clearApproval(tokenId);
    _removeTokenFrom(from, tokenId);
    _addTokenTo(to, tokenId);
    Transferred(tokenId, from, to);
  }

  function _clearApproval(uint tokenId) internal {
    allowedTransfer[tokenId] = 0;
    Approval(tokenOwner[tokenId], 0, tokenId);
  }

  function _removeTokenFrom(address from, uint tokenId) internal {
    require(_virtualLength[from] > 0);

    uint length = _virtualLength[from];
    uint index = _tokenIndexInOwnerArray[tokenId];
    uint swapToken = ownedTokens[from][length - 1];

    ownedTokens[from][index] = swapToken;
    _tokenIndexInOwnerArray[swapToken] = index;
    _virtualLength[from]--;
  }

  function _addTokenTo(address owner, uint tokenId) internal {
    if (ownedTokens[owner].length == _virtualLength[owner]) {
      ownedTokens[owner].push(tokenId);
    } else {
      ownedTokens[owner][_virtualLength[owner]] = tokenId;
    }
    tokenOwner[tokenId] = owner;
    _tokenIndexInOwnerArray[tokenId] = _virtualLength[owner];
    _virtualLength[owner]++;
  }
}

contract LANDToken is Ownable, BasicNFT {

  string public name = 'Decentraland World';
  string public symbol = 'LAND';

  mapping (uint => uint) public latestPing;

  event Ping(uint tokenId);

  function assignNewParcel(address beneficiary, uint tokenId, string _metadata) onlyOwner public {
    require(tokenOwner[tokenId] == 0);
    _assignNewParcel(beneficiary, tokenId, _metadata);
  }

  function _assignNewParcel(address beneficiary, uint tokenId, string _metadata) internal {
    latestPing[tokenId] = now;
    _addTokenTo(beneficiary, tokenId);
    totalTokens++;
    tokenMetadata[tokenId] = _metadata;

    Created(tokenId, beneficiary, _metadata);
  }

  function ping(uint tokenId) public {
    require(msg.sender == tokenOwner[tokenId]);

    latestPing[tokenId] = now;

    Ping(tokenId);
  }

  function buildTokenId(uint x, uint y) public constant returns (uint256) {
    return uint256(sha3(x, '|', y));
  }

  function exists(uint x, uint y) public constant returns (bool) {
    return ownerOfLand(x, y) != 0;
  }

  function ownerOfLand(uint x, uint y) public constant returns (address) {
    return tokenOwner[buildTokenId(x, y)];
  }

  function transferLand(address to, uint x, uint y) public {
    return transfer(to, buildTokenId(x, y));
  }

  function takeLand(uint x, uint y) public {
    return takeOwnership(buildTokenId(x, y));
  }

  function approveLandTransfer(address to, uint x, uint y) public {
    return approve(to, buildTokenId(x, y));
  }

  function landMetadata(uint x, uint y) constant public returns (string) {
    return tokenMetadata[buildTokenId(x, y)];
  }

  function updateLandMetadata(uint x, uint y, string _metadata) public {
    return updateTokenMetadata(buildTokenId(x, y), _metadata);
  }

  function updateManyLandMetadata(uint[] x, uint[] y, string _metadata) public {
    for (uint i = 0; i < x.length; i++) {
      updateTokenMetadata(buildTokenId(x[i], y[i]), _metadata);
    }
  }

  function claimForgottenParcel(address beneficiary, uint tokenId) onlyOwner public {
    require(tokenOwner[tokenId] != 0);
    require(latestPing[tokenId] < now);
    require(now - latestPing[tokenId] > 1 years);

    address oldOwner = tokenOwner[tokenId];
    latestPing[tokenId] = now;
    _transfer(oldOwner, beneficiary, tokenId);

    Transferred(tokenId, oldOwner, beneficiary);
  }
}

contract LANDTestSale is LANDToken {

  function LANDTestSale() {
    owner = this;
  }

  function buy(uint256 _x, uint256 _y, string _data) public {
    uint token = buildTokenId(_x, _y);
    if (ownerOf(token) != 0) {
      _transfer(ownerOf(token), msg.sender, token);
      tokenMetadata[token] = _data;
    } else {
      _assignNewParcel(msg.sender, token, _data);
    }
  }
}

