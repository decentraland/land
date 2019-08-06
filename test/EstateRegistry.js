import assertRevert from './helpers/assertRevert'
import setupContracts, {
  ESTATE_NAME,
  ESTATE_SYMBOL
} from './helpers/setupContracts'
import createEstateFull from './helpers/createEstateFull'
import { getSoliditySha3 } from './helpers/getSoliditySha3'

const BigNumber = web3.BigNumber

const LANDProxy = artifacts.require('LANDProxy')

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

/**
 * Important:
 *   The LAND registry uses an encoded version of the coordinates as the tokenId which you can find on LANDRegistry#encodeTokenId but
 *   you'll see that this file uses tokenIds like `1`, `2`, etc.
 *   This is because encoding a pair like `(0, 1)` returns `1`, `(0, 2)` returns `2`, and so on.
 */
contract('EstateRegistry', accounts => {
  const [
    creator,
    user,
    anotherUser,
    yetAnotherUser,
    hacker,
    operator
  ] = accounts

  let contracts = null
  let land = null
  let estate = null

  const creationParams = {
    gas: 7e6,
    gasPrice: 1e9,
    from: creator
  }
  const sentByUser = { ...creationParams, from: user }
  const sentByAnotherUser = { ...creationParams, from: anotherUser }
  const sentByCreator = { ...creationParams, from: creator }
  const sentByOperator = { ...creationParams, from: operator }
  const sentByHacker = { ...creationParams, from: hacker }

  const fiveX = [0, 0, 0, 0, 0]
  const fiveY = [1, 2, 3, 4, 5]

  const newMetadata = 'new land content'

  async function createEstateMetadata(xs, ys, owner, metadata, sendParams) {
    return createEstateFull(contracts, xs, ys, owner, metadata, sendParams)
  }

  async function createEstate(xs, ys, owner, sendParams) {
    return createEstateFull(contracts, xs, ys, owner, '', sendParams)
  }

  async function createTwoEstates(owner, sendParams) {
    await land.assignMultipleParcels([0, 0], [1, 2], owner, sentByCreator)
    await createEstate([0], [1], owner, sendParams)
    await createEstate([0], [2], owner, sendParams)

    let estateIds = await Promise.all([
      estate.tokenOfOwnerByIndex(owner, 0),
      estate.tokenOfOwnerByIndex(owner, 1)
    ])

    return estateIds.map(id => id.toNumber())
  }

  async function createUserEstateWithToken1() {
    await land.assignMultipleParcels([0], [1], user, sentByCreator)
    return createEstate([0], [1], user, sentByUser)
  }

  async function createUserEstateWithToken2() {
    await land.assignMultipleParcels([0], [2], user, sentByCreator)
    return createEstate([0], [2], user, sentByUser)
  }

  async function createUserEstateWithNumberedTokens() {
    await land.assignMultipleParcels(fiveX, fiveY, user, sentByCreator)
    return createEstate(fiveX, fiveY, user, sentByUser)
  }

  async function createAnotherUserEstateWithNumberedTokens() {
    await land.assignMultipleParcels(fiveY, fiveX, anotherUser, sentByCreator)
    return createEstate(fiveY, fiveX, anotherUser, sentByAnotherUser)
  }

  async function assertEstateCount(owner, expectedCount) {
    const tokenCount = await estate.balanceOf.call(owner)
    tokenCount.toNumber().should.be.equal(expectedCount)
  }

  async function assertRegistry(requiredRegistry) {
    const registry = await estate.registry.call()
    registry.should.be.equal(requiredRegistry)
  }

  async function assertMetadata(estateId, requiredMetadata) {
    const metadata = await estate.getMetadata.call(estateId)
    metadata.should.be.equal(requiredMetadata)
  }

  async function assertNFTBalance(user, expected) {
    const balance = await land.balanceOf(user)
    balance.toString().should.be.equal(expected.toString())
  }

  async function assertEstateSize(estateId, expected) {
    const balance = await estate.getEstateSize(estateId)
    balance.toString().should.be.equal(expected.toString())
  }

  async function assertNFTOwner(assetId, expectedOwner) {
    const owner = await land.ownerOf(assetId)
    owner.should.be.equal(expectedOwner)
  }

  function transferOut(estateId, index, who) {
    if (!who) {
      who = sentByUser
    }
    return estate.transferLand(estateId, index, anotherUser, who)
  }

  function transferIn(estateId, landId, userAddress = anotherUser) {
    return land.safeTransferFromToEstate(
      userAddress,
      estate.address,
      landId,
      estateId,
      getParams(userAddress)
    )
  }

  function getParams(userAddress) {
    let params = sentByAnotherUser

    if (userAddress === user) {
      params = sentByUser
    } else if (userAddress === creator) {
      params = sentByCreator
    }

    return params
  }

  async function assertLandIdAtIndex(estateId, index, value) {
    const landId = await estate.estateLandIds.call(estateId, index)
    landId.toString().should.be.equal(value.toString())
  }

  function assertEvent(log, expectedEventName, expectedArgs) {
    const { event, args } = log
    event.should.be.eq(expectedEventName)

    for (let key in expectedArgs) {
      let value = args[key]
      if (value instanceof BigNumber) {
        value = value.toString()
      }

      value.should.be.equal(expectedArgs[key], `[assertEvent] ${key}`)
    }
  }

  async function getEstateEvents(eventName) {
    return new Promise((resolve, reject) => {
      estate[eventName]().get(function(err, logs) {
        if (err) reject(new Error(`Error fetching the ${eventName} events`))
        resolve(logs)
      })
    })
  }

  beforeEach(async function() {
    contracts = await setupContracts(creator, creationParams)
    estate = contracts.estate
    land = contracts.land
  })

  describe('name', function() {
    it('has a name', async function() {
      const name = await estate.name()
      name.should.be.equal(ESTATE_NAME)
    })
  })

  describe('symbol', function() {
    it('has a symbol', async function() {
      const symbol = await estate.symbol()
      symbol.should.be.equal(ESTATE_SYMBOL)
    })
  })

  describe('set LAND Registry', function() {
    it('set works correctly', async function() {
      const registry = await LANDProxy.new(creationParams)
      await estate.setLANDRegistry(registry.address, creationParams)
      await assertRegistry(registry.address)
    })

    it('should throw if setting a non-contract', async function() {
      await assertRevert(estate.setLANDRegistry(hacker, creationParams))
    })

    it('unauthorized user can not set registry', async function() {
      const registry = await LANDProxy.new(creationParams)
      await assertRevert(
        estate.setLANDRegistry(registry.address, sentByAnotherUser)
      )
    })
  })

  describe('create Estate', function() {
    it('the registry can create estates', async function() {
      await createTwoEstates(user, sentByUser)
      await assertEstateCount(user, 2)
    })

    it('only the registry can create estates', async function() {
      await assertRevert(estate.mint(user, ''))
    })

    it('supports setting the metadata on create', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)

      const metadata = 'name,description'
      const estateId = await createEstateMetadata(
        [0],
        [1],
        user,
        metadata,
        sentByUser
      )
      await assertMetadata(estateId, metadata)
    })

    it('should emit the CreateEstate event on mint', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)

      const metadata = 'name,description'
      const { logs } = await estate.mintEstate(user, metadata)

      logs.length.should.be.equal(2)

      // ERC721
      assertEvent(logs[0], 'Transfer', {
        _from: EMPTY_ADDRESS,
        _to: user,
        _tokenId: '1'
      })

      // Estate
      assertEvent(logs[1], 'CreateEstate', {
        _owner: user,
        _estateId: '1',
        _data: metadata
      })
    })

    it('should allow operator to create an estate', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      await land.setApprovalForAll(anotherUser, true, sentByUser)
      await createEstate([0], [1], user, sentByAnotherUser)
      await assertEstateCount(user, 1)
    })

    it('fails if sender is not owner or operator of all LANDs', async function() {
      await land.assignMultipleParcels([0, 0], [1, 2], user, sentByCreator)
      await land.approve(anotherUser, 1, sentByUser)
      await assertRevert(
        createEstate([0, 0], [1, 2], anotherUser, sentByAnotherUser)
      )
    })

    it('fails if somebody else tries to steal LAND', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      await assertRevert(createEstate([0], [1], anotherUser, sentByAnotherUser))
    })
  })

  describe('transfer many Estates', function() {
    it('the owner can transfer many estates', async function() {
      const estateIds = await createTwoEstates(user, sentByUser)

      await estate.safeTransferManyFrom(
        user,
        anotherUser,
        estateIds,
        sentByUser
      )

      await assertEstateCount(user, 0)
      await assertEstateCount(anotherUser, 2)
    })

    it('only the owner can transfer many estates', async function() {
      const estateIds = await createTwoEstates(user, sentByUser)
      await assertRevert(
        estate.safeTransferManyFrom(
          user,
          anotherUser,
          estateIds,
          sentByAnotherUser
        )
      )
    })
  })

  describe('update metadata and update operator', function() {
    it('update works correctly :: holder', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.updateMetadata(estateId, newMetadata, sentByUser)
      await assertMetadata(estateId, newMetadata)
    })

    it('update works correctly :: updateOperator', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setUpdateOperator(estateId, anotherUser, sentByUser)
      await estate.updateMetadata(estateId, newMetadata, sentByAnotherUser)
      await assertMetadata(estateId, newMetadata)
    })

    it('update works correctly :: operator', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.approve(anotherUser, estateId, sentByUser)
      await estate.updateMetadata(estateId, newMetadata, sentByAnotherUser)
      await assertMetadata(estateId, newMetadata)
    })

    it('update works correctly :: approved for all', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await estate.updateMetadata(estateId, newMetadata, sentByAnotherUser)
      await assertMetadata(estateId, newMetadata)
    })

    it('unauthorized user can not update', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.updateMetadata(estateId, newMetadata, sentByAnotherUser)
      )
    })

    it('unauthorized user can not set update operator', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.setUpdateOperator(estateId, yetAnotherUser, sentByAnotherUser)
      )
    })

    it('update operator can not transfer tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setUpdateOperator(estateId, anotherUser, sentByUser)
      await assertRevert(
        estate.transferLand(estateId, 1, yetAnotherUser, sentByAnotherUser)
      )
    })

    it('should not allow an owner of an Estate transfer tokens out from an Estate which is not the owner', async function() {
      const estateId = await createUserEstateWithToken1()
      await land.assignMultipleParcels([0], [2], anotherUser, sentByCreator)
      await createEstate([0], [2], anotherUser, sentByAnotherUser)
      await assertRevert(estate.transferLand(estateId, 2, user, sentByUser))
    })
  })

  describe('transfer tokens', function() {
    it('owner can transfer tokens in', async function() {
      const estateId = await createUserEstateWithToken1()
      await land.assignMultipleParcels([0], [2], user, sentByCreator)
      await transferIn(estateId, 2, user)
      await assertEstateSize(estateId, 2)
    })

    it('transfering tokens in fires the AddLand event', async function() {
      const landId = '2'
      const estateId = await createUserEstateWithToken1()
      await land.assignMultipleParcels([0], [2], user, sentByCreator)

      let logs = await getEstateEvents('AddLand')
      logs.length.should.be.equal(0)

      await transferIn(estateId, 2, user)
      logs = await getEstateEvents('AddLand')

      logs.length.should.be.equal(1)
      assertEvent(logs[0], 'AddLand', { _estateId: estateId, _landId: landId })
    })

    it('user cannot transfer tokens to an undefined estate', async function() {
      const estateId = '1'
      await land.assignMultipleParcels([0], [2], user, sentByCreator)
      await assertRevert(transferIn(estateId, 2, user))
    })

    it('random user can transfer tokens in', async function() {
      const estateId = await createUserEstateWithToken1()
      await land.assignMultipleParcels([0], [2], anotherUser, sentByCreator)
      await transferIn(estateId, 2, anotherUser)
      await assertEstateSize(estateId, 2)
    })

    it('owner can transfer tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.transferLand(estateId, 1, anotherUser, sentByUser)
      await assertEstateSize(estateId, 0)
      await assertNFTOwner(1, anotherUser)
    })

    it('random user can not transfer tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.transferLand(estateId, 1, hacker, sentByAnotherUser)
      )
    })

    it('random user can not transfer many tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.transferManyLands(estateId, [1], hacker, sentByAnotherUser)
      )
    })

    it('owner can not transfer tokens out to the empty address', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.transferLand(estateId, 1, EMPTY_ADDRESS, sentByUser)
      )
    })

    it('transfering tokens out should emit the RemoveLand event', async function() {
      const landId = '1'
      const estateId = await createUserEstateWithToken1()

      let logs = await getEstateEvents('RemoveLand')
      logs.length.should.be.equal(0)

      await estate.transferLand(estateId, landId, anotherUser, sentByUser)

      logs = await getEstateEvents('RemoveLand')

      logs.length.should.be.equal(1)
      assertEvent(logs[0], 'RemoveLand', {
        _estateId: estateId,
        _landId: landId
      })
    })

    it('owner can transfer many tokens out', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      await estate.transferManyLands(
        estateId,
        [1, 2, 3],
        anotherUser,
        sentByUser
      )
      await assertEstateSize(estateId, 2)
    })
  })

  describe('operator transfering tokens', function() {
    it('operator can transfer tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await transferOut(estateId, 1, sentByAnotherUser)
    })

    it('operator can transfer many tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await estate.transferManyLands(
        estateId,
        [1],
        anotherUser,
        sentByAnotherUser
      )
    })

    it('operator can not transfer tokens out after deauth', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await transferOut(estateId, 1, sentByAnotherUser)
      await transferIn(estateId, 1)
      await estate.setApprovalForAll(anotherUser, false, sentByUser)
      await assertRevert(transferOut(estateId, 1, sentByAnotherUser))
    })

    it('operator can not transfer many tokens out after deauth', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await transferOut(estateId, 1, sentByAnotherUser)
      await transferIn(estateId, 1)
      await estate.setApprovalForAll(anotherUser, false, sentByUser)
      await assertRevert(
        estate.transferManyLands(estateId, [1], anotherUser, sentByAnotherUser)
      )
    })
  })

  describe('order of tokens is correctly accounted', function() {
    it('five in, middle out, one in, middle out', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      await assertNFTBalance(estate.address, 5)
      await transferOut(estateId, 2)
      await assertLandIdAtIndex(estateId, 1, 5)
      await transferIn(estateId, 2)
      await assertLandIdAtIndex(estateId, 4, 2)
      await transferOut(estateId, 3)
      await assertLandIdAtIndex(estateId, 2, 2)
    })

    it('five in, empty, refill', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      await transferOut(estateId, 2)
      await transferOut(estateId, 1)
      await transferOut(estateId, 3)
      await transferOut(estateId, 4)
      await transferOut(estateId, 5)
      await assertNFTBalance(estate.address, 0)
      await transferIn(estateId, 2)
      await transferIn(estateId, 1)
      await transferIn(estateId, 3)
      await transferIn(estateId, 4)
      await transferIn(estateId, 5)
      await assertNFTBalance(estate.address, 5)
      await assertLandIdAtIndex(estateId, 0, 2)
      await assertLandIdAtIndex(estateId, 1, 1)
      await assertLandIdAtIndex(estateId, 2, 3)
      await assertLandIdAtIndex(estateId, 3, 4)
      await assertLandIdAtIndex(estateId, 4, 5)
    })
  })

  describe('fingerprint management', function() {
    it('supports verifyFingerprint interface', async function() {
      const isSupported = await estate.supportsInterface(
        web3.sha3('verifyFingerprint(uint256,bytes)')
      )
      expect(isSupported).be.true
    })

    it('creates the fingerprint correctly', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      const expectedHash = await getEstateHash(estateId, fiveX, fiveY)
      const fingerprint = await estate.getFingerprint(estateId)

      expect(fingerprint).to.be.equal(expectedHash)
    })

    it('should change the fingerprint as the composable children change', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      const firstHash = await getEstateHash(estateId, fiveX, fiveY)

      let fingerprint

      await land.assignMultipleParcels([10, 11], [-1, -19], user, sentByCreator)
      const newLandIds = await Promise.all([
        land.encodeTokenId(10, -1),
        land.encodeTokenId(11, -19)
      ])

      await transferIn(estateId, newLandIds[0], user)
      fingerprint = await estate.getFingerprint(estateId)
      expect(fingerprint).not.to.be.equal(firstHash)

      fingerprint = await estate.getFingerprint(estateId)
      await transferIn(estateId, newLandIds[1], user)
      expect(fingerprint).not.to.be.equal(firstHash)

      await transferOut(estateId, newLandIds[0], sentByUser)
      await transferOut(estateId, newLandIds[1], sentByUser)

      fingerprint = await estate.getFingerprint(estateId)
      expect(fingerprint).to.be.equal(firstHash)
    })

    it('should encode only the id on empty estates', async function() {
      await land.assignMultipleParcels([0], [0], user, sentByCreator)
      const estateId = await createEstate([0], [0], user, sentByUser)
      await transferOut(estateId, 0, sentByUser)

      const expectedHash = getSoliditySha3('estateId', estateId)
      const fingerprint = await estate.getFingerprint(estateId)

      expect(fingerprint).to.be.equal(expectedHash)
    })

    it('should generate the same hash even if the parcel order changes', async function() {
      await land.assignMultipleParcels(fiveX, fiveY, user, sentByCreator)
      const estateId = await createEstate(fiveX, fiveY, user, sentByUser)

      const fingerprint = await estate.getFingerprint(estateId)

      // Remove LANDs
      for (const [index, x] of fiveX.entries()) {
        const y = fiveY[index]
        const landId = await land.encodeTokenId(x, y)
        await estate.transferLand(estateId, landId, user, sentByUser)
      }

      // Reverse order
      for (const [index, x] of fiveX.reverse().entries()) {
        const y = fiveY[index]
        const landId = await land.encodeTokenId(x, y)
        await transferIn(estateId, landId, user)
      }

      // Regenerate fingerprint
      const reverseFingerprint = await estate.getFingerprint(estateId)

      expect(fingerprint).to.be.equal(reverseFingerprint)
    })

    it('verifies the fingerprint correctly', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      const expectedHash = await getEstateHash(estateId, fiveX, fiveY)
      const result = await estate.verifyFingerprint(estateId, expectedHash)
      expect(result).to.be.true
    })

    async function getEstateHash(estateId, xCoords, yCoords) {
      const firstLandId = await land.encodeTokenId(xCoords[0], yCoords[0])

      let expectedHash = await contracts.estate.calculateXor(
        'estateId', // salt
        estateId,
        firstLandId
      )

      for (let i = 1; i < xCoords.length; i++) {
        const landId = await land.encodeTokenId(xCoords[i], yCoords[i])
        expectedHash = await contracts.estate.compoundXor(expectedHash, landId)
      }

      return expectedHash
    }

    it('should not have checksum collision with one LAND', async function() {
      const estateId1 = await createUserEstateWithToken2() // Estate Id: 1, Land Id: 2
      const estateId2 = await createUserEstateWithToken1() // Estate Id: 2, Land Id: 1
      const fingerprint1 = await estate.getFingerprint(estateId1)
      const fingerprint2 = await estate.getFingerprint(estateId2)
      expect(fingerprint1).to.not.be.equal(fingerprint2)
    })

    it('should not have checksum collision with multiple LANDs', async function() {
      const estateId1 = await createUserEstateWithNumberedTokens()
      const estateId2 = await createAnotherUserEstateWithNumberedTokens()
      const fingerprint1 = await estate.getFingerprint(estateId1)
      const fingerprint2 = await estate.getFingerprint(estateId2)
      expect(fingerprint1).to.not.be.equal(fingerprint2)
    })
  })

  describe('LAND update', function() {
    it('should allow owner of an Estate to update LAND data', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      const estateId = await createEstate([0], [1], user, sentByUser)
      await estate.updateLandData(estateId, 1, 'newValue', sentByUser)
      const data = await land.landData(0, 1, sentByUser)
      data.should.be.equal('newValue')
    })

    it('should allow operator of an Estate to update LAND data', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      const estateId = await createEstate([0], [1], user, sentByUser)
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await estate.updateLandData(estateId, 1, 'newValue', sentByAnotherUser)
      const data = await land.landData(0, 1, sentByUser)
      data.should.be.equal('newValue')
    })

    it('should allow update operator of an Estate to update LAND data', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      const estateId = await createEstate([0], [1], user, sentByUser)
      await estate.setUpdateOperator(estateId, anotherUser, sentByUser)
      await estate.updateLandData(estateId, 1, 'newValue', sentByAnotherUser)
      const data = await land.landData(0, 1, sentByUser)
      data.should.be.equal('newValue')
    })

    it('should allow a LAND updateOperator to update LAND data', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setLandUpdateOperator(estateId, 1, anotherUser, sentByUser)
      await estate.updateLandData(estateId, 1, 'newValue', sentByAnotherUser)
      const data = await land.landData(0, 1, sentByUser)
      data.should.be.equal('newValue')
    })

    it('should not allow owner an Estate to update LAND data of an Estate which is not the owner', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      const estateIdByUser = await createEstate([0], [1], user, sentByUser)
      await land.assignMultipleParcels([0], [2], anotherUser, sentByCreator)
      await createEstate([0], [2], anotherUser, sentByAnotherUser)
      await assertRevert(
        estate.updateLandData(estateIdByUser, 2, 'newValue', sentByUser)
      )
    })

    it('should not allow neither operator, nor owner nor updateOperator nor LAND updateOperator of an Estate to update LAND data', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      const estateId = await createEstate([0], [1], user, sentByUser)
      await assertRevert(
        estate.updateLandData(estateId, 1, 'newValue', sentByAnotherUser)
      )
    })

    it('should not allow old owner to update LAND data after creating an Estate', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      await createEstate([0], [1], user, sentByUser)
      await assertRevert(land.updateLandData(0, 1, 'newValue', sentByUser))
    })

    it('should not allow old operator to update LAND data after creating an Estate', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      await land.setApprovalForAll(anotherUser, true, sentByUser)
      const estateId = await createEstate([0], [1], user, sentByAnotherUser)
      await assertRevert(
        land.updateLandData(estateId, 1, 'newValue', sentByAnotherUser)
      )
    })
  })

  describe('LANDs update', function() {
    it('should allow owner of an Estate to update LANDs data', async function() {
      await land.assignMultipleParcels([0, 0], [1, 2], user, sentByCreator)
      const estateId = await createEstate([0, 0], [1, 2], user, sentByUser)
      await estate.updateManyLandData(estateId, [1, 2], 'newValue', sentByUser)
      const landsData = await Promise.all([
        land.landData(0, 1, sentByUser),
        land.landData(0, 2, sentByUser)
      ])

      landsData.forEach(data => data.should.be.equal('newValue'))
    })

    it('should allow operator of an Estate to update LANDs data', async function() {
      await land.assignMultipleParcels([0, 0], [1, 2], user, sentByCreator)
      const estateId = await createEstate([0, 0], [1, 2], user, sentByUser)
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await estate.updateManyLandData(
        estateId,
        [1, 2],
        'newValue',
        sentByAnotherUser
      )
      const landsData = await Promise.all([
        land.landData(0, 1, sentByUser),
        land.landData(0, 2, sentByUser)
      ])

      landsData.forEach(data => data.should.be.equal('newValue'))
    })

    it('should allow update operator of an Estate to update LANDs data', async function() {
      await land.assignMultipleParcels([0, 0], [1, 2], user, sentByCreator)
      const estateId = await createEstate([0, 0], [1, 2], user, sentByUser)
      await estate.setUpdateOperator(estateId, anotherUser, sentByUser)
      await estate.updateManyLandData(
        estateId,
        [1, 2],
        'newValue',
        sentByAnotherUser
      )
      const landsData = await Promise.all([
        land.landData(0, 1, sentByUser),
        land.landData(0, 2, sentByUser)
      ])

      landsData.forEach(data => data.should.be.equal('newValue'))
    })

    it('should not allow owner an Estate to update LANDs data of an Estate which is not the owner', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      const estateIdByUser = await createEstate([0], [1], user, sentByUser)
      await land.assignMultipleParcels([0], [2], anotherUser, sentByCreator)
      await createEstate([0], [2], anotherUser, sentByAnotherUser)
      await assertRevert(
        estate.updateManyLandData(estateIdByUser, [2], 'newValue', sentByUser)
      )
    })

    it('should not allow neither operator nor owner nor updateOperator of an Estate to update LANDs data', async function() {
      await land.assignMultipleParcels([0, 0], [1, 2], user, sentByCreator)
      const estateId = await createEstate([0, 0], [1, 2], user, sentByUser)
      await assertRevert(
        estate.updateManyLandData(
          estateId,
          [1, 2],
          'newValue',
          sentByAnotherUser
        )
      )
    })

    it('should not allow old owner to update LANDs data after creating an Estate', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      await createEstate([0], [1], user, sentByUser)
      await assertRevert(
        land.updateManyLandData([0], [1], 'newValue', sentByUser)
      )
    })

    it('should not allow old operator to update LANDs data after creating an Estate', async function() {
      await land.assignMultipleParcels([0], [1], user, sentByCreator)
      await land.setApprovalForAll(anotherUser, true, sentByUser)
      await createEstate([0], [1], user, sentByAnotherUser)
      await assertRevert(
        land.updateManyLandData([0], [1], 'newValue', sentByAnotherUser)
      )
    })
  })

  describe('support interfaces', function() {
    it('should support InterfaceId_GetMetadata interface', async function() {
      const interfaceId = await estate.getMetadataInterfaceId()
      const isSupported = await estate.supportsInterface(interfaceId)
      expect(isSupported).be.true
    })

    it('should support inherited InterfaceId_ERC721 and InterfaceId_ERC721Exists interfaces', async function() {
      let interfaceId = '0x80ac58cd' // InterfaceId_ERC721
      let isSupported = await estate.supportsInterface(interfaceId)
      expect(isSupported).be.true

      interfaceId = '0x4f558e79' // InterfaceId_ERC721Exists
      isSupported = await estate.supportsInterface(interfaceId)
      expect(isSupported).be.true
    })

    it('should not support not defined interface', async function() {
      const isSupported = await estate.supportsInterface('123456')
      expect(isSupported).be.false
    })
  })

  describe('Update Operator', function() {
    it('should clean update operator after transfer the Estate :: safeTransferFrom', async function() {
      const estateId = await createUserEstateWithToken1()

      let owner = await estate.ownerOf(estateId)
      owner.should.be.equal(user)

      await estate.setUpdateOperator(estateId, anotherUser, sentByUser)
      let updateOperator = await estate.updateOperator(estateId, sentByUser)
      expect(updateOperator).be.equal(anotherUser)

      await estate.safeTransferFrom(user, anotherUser, estateId, sentByUser)

      let logs = await getEstateEvents('UpdateOperator')
      expect(logs.length).be.equal(0)
      logs = await getEstateEvents('Transfer')
      expect(logs.length).be.equal(1)

      updateOperator = await estate.updateOperator(estateId, sentByUser)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      owner = await estate.ownerOf(estateId)
      owner.should.be.equal(anotherUser)
    })

    it('should clean update operator after transfer the Estate :: safeTransferFrom with bytes', async function() {
      const estateId = await createUserEstateWithToken1()

      let owner = await estate.ownerOf(estateId)
      owner.should.be.equal(user)

      await estate.setUpdateOperator(estateId, anotherUser, sentByUser)
      let updateOperator = await estate.updateOperator(estateId, sentByUser)
      expect(updateOperator).be.equal(anotherUser)

      await estate.safeTransferFromWithBytes(
        user,
        anotherUser,
        estateId,
        '0x',
        sentByUser
      )

      let logs = await getEstateEvents('UpdateOperator')
      expect(logs.length).be.equal(0)
      logs = await getEstateEvents('Transfer')
      expect(logs.length).be.equal(1)

      updateOperator = await estate.updateOperator(estateId, sentByUser)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      owner = await estate.ownerOf(estateId)
      owner.should.be.equal(anotherUser)
    })

    it('should clean update operator after transfer the Estate :: transferFrom', async function() {
      const estateId = await createUserEstateWithToken1()

      let owner = await estate.ownerOf(estateId)
      owner.should.be.equal(user)

      await estate.setUpdateOperator(estateId, anotherUser, sentByUser)
      let updateOperator = await estate.updateOperator(estateId, sentByUser)
      expect(updateOperator).be.equal(anotherUser)

      await estate.transferFrom(user, anotherUser, estateId, sentByUser)

      let logs = await getEstateEvents('UpdateOperator')
      expect(logs.length).be.equal(0)

      logs = await getEstateEvents('Transfer')
      expect(logs.length).be.equal(1)

      updateOperator = await estate.updateOperator(estateId, sentByUser)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      owner = await estate.ownerOf(estateId)
      owner.should.be.equal(anotherUser)
    })

    it('should clean update operator after transfer the Estate :: safeTransferManyFrom', async function() {
      const estateIds = await createTwoEstates(user, sentByUser)

      let owner = await estate.ownerOf(estateIds[0])
      owner.should.be.equal(user)

      owner = await estate.ownerOf(estateIds[1])
      owner.should.be.equal(user)

      await estate.setUpdateOperator(estateIds[0], anotherUser, sentByUser)
      let updateOperator = await estate.updateOperator(estateIds[0], sentByUser)
      expect(updateOperator).be.equal(anotherUser)

      await estate.setUpdateOperator(estateIds[1], anotherUser, sentByUser)
      updateOperator = await estate.updateOperator(estateIds[1], sentByUser)
      expect(updateOperator).be.equal(anotherUser)

      await estate.safeTransferManyFrom(
        user,
        anotherUser,
        estateIds,
        sentByUser
      )

      let logs = await getEstateEvents('UpdateOperator')
      expect(logs.length).be.equal(0)

      logs = await getEstateEvents('Transfer')
      expect(logs.length).be.equal(2)

      updateOperator = await estate.updateOperator(estateIds[0], sentByUser)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)
      updateOperator = await estate.updateOperator(estateIds[1], sentByUser)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      owner = await estate.ownerOf(estateIds[0])
      owner.should.be.equal(anotherUser)

      owner = await estate.ownerOf(estateIds[1])
      owner.should.be.equal(anotherUser)
    })

    it('should set an update operator by updateManager', async function() {
      await createUserEstateWithToken1()

      let updateOperator = await estate.updateOperator(1)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      await estate.setUpdateManager(user, operator, true, sentByUser)
      await estate.setUpdateOperator(1, anotherUser, sentByOperator)

      updateOperator = await estate.updateOperator(1)
      expect(updateOperator).be.equal(anotherUser)
    })
  })

  describe('Update LAND Update Operator', function() {
    it('should update LAND updateOperator by estate owner', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setLandUpdateOperator(estateId, 1, anotherUser, sentByUser)
      const updateOperator = await land.updateOperator(1)
      updateOperator.should.be.equal(anotherUser)
    })

    it('should update LAND updateOperator by estate operator', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.approve(anotherUser, estateId, sentByUser)
      await estate.setLandUpdateOperator(
        estateId,
        1,
        yetAnotherUser,
        sentByAnotherUser
      )
      const updateOperator = await land.updateOperator(1)
      updateOperator.should.be.equal(yetAnotherUser)
    })

    it('should update LAND updateOperator by updateManager', async function() {
      let updateOperator = await land.updateOperator(1)
      updateOperator.should.be.equal(EMPTY_ADDRESS)

      await estate.setUpdateManager(user, anotherUser, true, sentByUser)

      const estateId = await createUserEstateWithToken1()

      await estate.setLandUpdateOperator(
        estateId,
        1,
        yetAnotherUser,
        sentByAnotherUser
      )

      updateOperator = await land.updateOperator(1)
      updateOperator.should.be.equal(yetAnotherUser)
    })

    it('should clean LAND updateOperator', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setLandUpdateOperator(
        estateId,
        1,
        yetAnotherUser,
        sentByUser
      )
      let updateOperator = await land.updateOperator(1)
      updateOperator.should.be.equal(yetAnotherUser)

      await estate.setLandUpdateOperator(estateId, 1, EMPTY_ADDRESS, sentByUser)
      updateOperator = await land.updateOperator(1)
      updateOperator.should.be.equal(EMPTY_ADDRESS)

      await estate.approve(anotherUser, estateId, sentByUser)
      await estate.setLandUpdateOperator(
        estateId,
        1,
        yetAnotherUser,
        sentByAnotherUser
      )
      updateOperator = await land.updateOperator(1)
      updateOperator.should.be.equal(yetAnotherUser)

      await estate.setLandUpdateOperator(
        estateId,
        1,
        EMPTY_ADDRESS,
        sentByAnotherUser
      )
      updateOperator = await land.updateOperator(1)
      updateOperator.should.be.equal(EMPTY_ADDRESS)
    })

    it('reverts when updating LAND updateOperator by estate updateOperator', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setUpdateOperator(estateId, anotherUser, sentByUser)
      await assertRevert(
        estate.setLandUpdateOperator(
          estateId,
          2,
          yetAnotherUser,
          sentByAnotherUser
        )
      )
    })

    it('reverts when updating LAND updateOperator for a LAND outside the estate', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.setLandUpdateOperator(estateId, 2, anotherUser, sentByUser)
      )
    })

    it('reverts when updating LAND updateOperator for a LAND from another estate', async function() {
      const estateId = await createUserEstateWithToken1()
      await createUserEstateWithToken2()
      await assertRevert(
        estate.setLandUpdateOperator(estateId, 2, anotherUser, sentByUser)
      )
    })

    it('reverts when updating LAND updateOperator by hacker', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.setLandUpdateOperator(
          estateId,
          1,
          anotherUser,
          sentByAnotherUser
        )
      )
    })
  })

  describe('UpdateManager', function() {
    beforeEach(async function() {
      await createTwoEstates(user, sentByUser)
    })

    it('should set updateManager by owner', async function() {
      const { logs } = await estate.setUpdateManager(
        user,
        operator,
        true,
        sentByUser
      )
      // Event emitted
      logs.length.should.be.equal(1)

      const log = logs[0]
      log.event.should.be.eq('UpdateManager')
      log.args._owner.should.be.bignumber.equal(user)
      log.args._operator.should.be.equal(operator)
      log.args._caller.should.be.equal(user)
      log.args._approved.should.be.equal(true)

      let isUpdateManager = await estate.updateManager(user, operator)
      isUpdateManager.should.be.equal(true)

      await estate.setUpdateManager(user, operator, false, sentByUser)
      isUpdateManager = await estate.updateManager(user, operator)
      isUpdateManager.should.be.equal(false)
    })

    it('should set updateManager by approvedForAll', async function() {
      await estate.setApprovalForAll(anotherUser, true, sentByUser)

      const { logs } = await estate.setUpdateManager(
        user,
        operator,
        true,
        sentByAnotherUser
      )
      // Event emitted
      logs.length.should.be.equal(1)

      const log = logs[0]
      log.event.should.be.eq('UpdateManager')
      log.args._owner.should.be.bignumber.equal(user)
      log.args._operator.should.be.equal(operator)
      log.args._caller.should.be.equal(anotherUser)
      log.args._approved.should.be.equal(true)

      let isUpdateManager = await estate.updateManager(user, operator)
      isUpdateManager.should.be.equal(true)

      await estate.setUpdateManager(user, operator, false, sentByAnotherUser)
      isUpdateManager = await estate.updateManager(user, operator)
      isUpdateManager.should.be.equal(false)
    })

    it('should allow updateManager to update content', async function() {
      await assertMetadata(1, '')
      await assertMetadata(2, '')

      await estate.setUpdateManager(user, operator, true, sentByUser)

      await estate.updateMetadata(1, 'newValue', sentByOperator)
      await estate.updateMetadata(2, 'newValue', sentByOperator)

      await assertMetadata(1, 'newValue')
      await assertMetadata(2, 'newValue')
    })

    it('should allow updateManager to update content on new Estate', async function() {
      await estate.setUpdateManager(user, operator, true, sentByUser)

      await land.assignMultipleParcels([0, 0], [3, 4], user, sentByCreator)
      const estateId = await createEstate([0, 0], [3, 4], user, sentByUser)

      await assertMetadata(estateId, '')

      await estate.updateMetadata(estateId, 'newValue', sentByOperator)

      await assertMetadata(estateId, 'newValue')
    })

    it('should allow updateManager to update content on LANDs as part of the Estate', async function() {
      await estate.setUpdateManager(user, operator, true, sentByUser)

      let data = await land.landData(0, 1)
      data.should.be.equal('')

      await estate.updateLandData(1, 1, 'newValue', sentByOperator)

      data = await land.landData(0, 1)
      data.should.be.equal('newValue')
    })

    it('should has false as default value for updateManager', async function() {
      const isUpdateManager = await estate.updateManager(user, operator)
      isUpdateManager.should.be.equal(false)
    })

    it('should set multiple updateManager', async function() {
      await estate.setUpdateManager(user, operator, true, sentByUser)
      await estate.setUpdateManager(user, anotherUser, true, sentByUser)

      let isUpdateManager = await estate.updateManager(user, operator)
      isUpdateManager.should.be.equal(true)

      isUpdateManager = await estate.updateManager(user, anotherUser)
      isUpdateManager.should.be.equal(true)
    })

    it('clears updateManager correctly ', async function() {
      await assertMetadata(1, '')

      await estate.setUpdateManager(user, operator, true, sentByUser)

      await estate.updateMetadata(1, 'newValue', sentByOperator)

      await assertMetadata(1, 'newValue')

      await estate.setUpdateManager(user, operator, false, sentByUser)

      await assertRevert(estate.updateMetadata(1, 'again', sentByOperator))
    })

    it('reverts when updateManager trying to change content of no owned by the owner Estate', async function() {
      await estate.setUpdateManager(user, operator, true, sentByUser)

      await estate.transferFrom(user, anotherUser, 1, sentByUser)

      await assertMetadata(2, '', sentByOperator)

      await estate.updateMetadata(2, 'newValue', sentByOperator)

      await assertMetadata(2, 'newValue', sentByOperator)

      await assertRevert(estate.updateMetadata(1, 'newValue', sentByOperator))
    })

    it('reverts if owner set himself as updateManager', async function() {
      await assertRevert(estate.setUpdateManager(user, user, true, sentByUser))
    })

    it('reverts if not owner or approvedForAll set updateManager', async function() {
      // Not owner
      await assertRevert(
        estate.setUpdateManager(user, operator, true, sentByAnotherUser)
      )

      // Hacker
      await assertRevert(
        estate.setUpdateManager(user, operator, true, sentByHacker)
      )

      // Operator
      await estate.approve(operator, 1, sentByUser)
      await assertRevert(
        estate.setUpdateManager(user, operator, true, sentByOperator)
      )

      // Update Operator
      await estate.setUpdateOperator(1, anotherUser, sentByUser)
      await assertRevert(
        estate.setUpdateManager(user, operator, true, sentByAnotherUser)
      )
    })

    it('reverts when updateManager trying to transfer', async function() {
      await estate.setUpdateManager(user, operator, true, sentByUser)
      await assertRevert(
        estate.transferFrom(user, anotherUser, 1, sentByOperator)
      )
    })

    it('reverts when updateManager trying to set updateManager', async function() {
      await estate.setUpdateManager(user, operator, true, sentByUser)
      await assertRevert(
        estate.setUpdateManager(user, anotherUser, 1, sentByOperator)
      )
    })

    it('reverts when updateManager trying to set operator', async function() {
      await estate.setUpdateManager(user, operator, true, sentByUser)
      await assertRevert(estate.approve(anotherUser, 1, sentByOperator))
    })

    it('reverts when updateManager trying move LANDs from Estate', async function() {
      await estate.setUpdateManager(user, operator, true, sentByUser)

      await assertRevert(estate.transferLand(1, 1, anotherUser, sentByOperator))
    })
  })

  describe('setManyUpdateOperator', function() {
    let estateId1
    let estateId2
    beforeEach(async function() {
      estateId1 = await createUserEstateWithToken1()
      estateId2 = await createUserEstateWithToken2()
    })

    it('should set update operator', async function() {
      let updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      await estate.setManyUpdateOperator([estateId1], operator, sentByUser)

      updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(operator)
    })

    it('should set many update operator :: owner', async function() {
      let updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      await estate.setManyUpdateOperator(
        [estateId1, estateId2],
        operator,
        sentByUser
      )

      updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(operator)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(operator)
    })

    it('should set many update operator :: approvedForAll', async function() {
      let updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await estate.setManyUpdateOperator(
        [estateId1, estateId2],
        operator,
        sentByAnotherUser
      )

      updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(operator)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(operator)
    })

    it('should set many update operator :: operator', async function() {
      let updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      await estate.approve(anotherUser, estateId1, sentByUser)
      await estate.approve(anotherUser, estateId2, sentByUser)

      await estate.setManyUpdateOperator(
        [estateId1, estateId2],
        operator,
        sentByAnotherUser
      )

      updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(operator)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(operator)
    })

    it('should set many update operator :: updateManager', async function() {
      let updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      await estate.setUpdateManager(user, anotherUser, true, sentByUser)

      await estate.setManyUpdateOperator(
        [estateId1, estateId2],
        operator,
        sentByAnotherUser
      )

      updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(operator)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(operator)
    })

    it('should clean many update operator', async function() {
      let updateOperator
      await estate.setManyUpdateOperator(
        [estateId1, estateId2],
        anotherUser,
        sentByUser
      )

      updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(anotherUser)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(anotherUser)

      await estate.setManyUpdateOperator(
        [estateId1, estateId2],
        EMPTY_ADDRESS,
        sentByUser
      )

      updateOperator = await estate.updateOperator(estateId1)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)
      updateOperator = await estate.updateOperator(estateId2)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)
    })

    it('reverts when updateOperator try to set many update operator', async function() {
      await estate.setUpdateOperator(estateId1, anotherUser, sentByUser)

      await assertRevert(
        estate.setManyUpdateOperator([estateId1], operator, sentByAnotherUser)
      )
    })

    it('reverts when unauthorized user try to set many update operator', async function() {
      await assertRevert(
        estate.setManyUpdateOperator([estateId1], operator, sentByAnotherUser)
      )
    })
  })

  describe('setManyLandUpdateOperator', function() {
    let estateId
    let updateOperator
    beforeEach(async function() {
      estateId = await createUserEstateWithNumberedTokens()
      updateOperator = EMPTY_ADDRESS
    })

    it('should set LAND update operator', async function() {
      updateOperator = await land.updateOperator(1)
      expect(updateOperator).be.equal(EMPTY_ADDRESS)

      await estate.setManyLandUpdateOperator(
        estateId,
        [1],
        anotherUser,
        sentByUser
      )

      updateOperator = await land.updateOperator(1)
      updateOperator.should.be.equal(anotherUser)
    })

    it('should set many LAND update operator :: owner', async function() {
      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(EMPTY_ADDRESS)
      }

      await estate.setManyLandUpdateOperator(
        estateId,
        fiveY,
        anotherUser,
        sentByUser
      )

      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(anotherUser)
      }
    })

    it('should set many LAND update operator :: approvedForAll', async function() {
      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(EMPTY_ADDRESS)
      }

      await estate.setApprovalForAll(anotherUser, true, sentByUser)

      await estate.setManyLandUpdateOperator(
        estateId,
        fiveY,
        operator,
        sentByAnotherUser
      )

      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(operator)
      }
    })

    it('should set many LAND update operator :: operator', async function() {
      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(EMPTY_ADDRESS)
      }

      await estate.approve(anotherUser, estateId, sentByUser)
      await estate.setManyLandUpdateOperator(
        estateId,
        fiveY,
        operator,
        sentByAnotherUser
      )

      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(operator)
      }
    })

    it('should set many LAND update operator :: updateManager', async function() {
      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(EMPTY_ADDRESS)
      }

      await estate.setUpdateManager(user, anotherUser, true, sentByUser)

      await estate.setManyLandUpdateOperator(
        estateId,
        fiveY,
        operator,
        sentByAnotherUser
      )

      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(operator)
      }
    })

    it('should clean many LAND update operator', async function() {
      await estate.setManyLandUpdateOperator(
        estateId,
        fiveY,
        anotherUser,
        sentByUser
      )

      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(anotherUser)
      }

      await estate.setManyLandUpdateOperator(
        estateId,
        fiveY,
        EMPTY_ADDRESS,
        sentByUser
      )

      for (let id of fiveY) {
        updateOperator = await land.updateOperator(id)
        expect(updateOperator).be.equal(EMPTY_ADDRESS)
      }
    })

    it('reverts when updateOperator try to set many LAND update operator', async function() {
      await estate.setUpdateOperator(estateId, anotherUser, sentByUser)

      await assertRevert(
        estate.setManyLandUpdateOperator(
          estateId,
          fiveY,
          yetAnotherUser,
          sentByAnotherUser
        )
      )
    })

    it('reverts when setting LAND updateOperator for a LAND outside the estate', async function() {
      await land.assignMultipleParcels([0], [6], user, sentByCreator)
      await createEstate([0], [6], user, sentByUser)

      await assertRevert(
        estate.setManyLandUpdateOperator(estateId, [6], anotherUser, sentByUser)
      )
    })

    it('reverts when unauthorized user try to set many update operator', async function() {
      await assertRevert(
        estate.setManyLandUpdateOperator(
          estateId,
          fiveY,
          operator,
          sentByAnotherUser
        )
      )
    })
  })
})
