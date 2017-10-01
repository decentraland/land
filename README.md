# LAND

Contracts for Decentraland's World.

## Overview

The LAND contract keeps a record of all the land parcels, who their owner is,
and what data is associated with them. The data associated can be an IPFS
identifier, an IPNS url, or a simple HTTPS endpoint with a land description
file.

## API

These are the methods of the LAND contract. LAND parcels are identified by a
256 bit value unsigned integer.

* `totalSupply():uint` returns the total amount of land that was claimed

* `ownerOf(uint tokenId):address` returns who the owner of the token is

* `balanceOf(address)`: returns the amount of land a user has.

* `tokenByIndex(address owner, uint i)`: returns the identifier of the `i`-th
  land parcel owned by `owner`

* `updateTokenMetadata(uint, bytes)`: set the data associated with this land
  parcel

* `transfer(uint, address)`: transfer a land parcel to another party

* `approve(address beneficiary, uint token)`: allow `beneficiary` to transfer
  a land parcel to any address.

* `transferFrom(uint, address)`: transfer a land parcel after `approve` was
  called by the owner.

* `ping(uint tokenId)`: Update the countdown before a parcel is considered
  forgotten.

* `claimForgottenParcel(address beneficiary, uint tokenId)`: claim an abandoned
  land parcel.


## License

Code released under [the Apache v2.0 license](https://github.com/decentraland/land/blob/master/LICENSE).
