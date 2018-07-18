import assertRevert from './helpers/assertRevert'

const BigNumber = web3.BigNumber

const LANDRegistry = artifacts.require('LANDRegistryTest')
const EstateRegistry = artifacts.require('EstateRegistry')
const LANDProxy = artifacts.require('LANDProxy')

const NONE = '0x0000000000000000000000000000000000000000'

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('EstateRegistry', accounts => {
  const [creator, user, anotherUser, yetAnotherUser, hacker] = accounts

  let registry = null
  let proxy = null
  let land = null
  let estate = null
  const _name = 'Estate'
  const _symbol = 'EST'

  const creationParams = {
    gas: 7e6,
    gasPrice: 1e9,
    from: creator
  }
  const sentByUser = { ...creationParams, from: user }
  const sentByAnotherUser = { ...creationParams, from: anotherUser }
  const sentByCreator = { ...creationParams, from: creator }

  const sixX = [0, 0, 1, 1, -3, -4]
  const sixY = [2, -1, 1, -2, 2, 2]

  const fiveX = [0, 0, 0, 0, 0]
  const fiveY = [1, 2, 3, 4, 5]

  const newMsg = 'new land content'

  async function setupRegistry() {
    proxy = await LANDProxy.new(creationParams)
    registry = await LANDRegistry.new(creationParams)
    await proxy.upgrade(registry.address, creator, sentByCreator)

    land = await LANDRegistry.at(proxy.address)
    estate = await EstateRegistry.new(
      _name,
      _symbol,
      proxy.address,
      creationParams
    )

    await land.initialize(creator, sentByCreator)
    await land.setEstateRegistry(estate.address)
  }

  async function createEstate(xs, ys, owner, sendParams) {
    await land.createEstate(xs, ys, owner, sendParams)

    const tokenCount = await estate.balanceOf.call(owner)
    const token = await estate.tokenOfOwnerByIndex(owner, tokenCount - 1)

    return token.toString()
  }

  async function createUserEstateWithToken1() {
    await land.assignMultipleParcels([0], [1], user, sentByCreator)
    return createEstate([0], [1], user, sentByUser)
  }

  async function createUserEstateWithNumberedTokens() {
    await land.assignMultipleParcels(fiveX, fiveY, user, sentByCreator)
    return createEstate(fiveX, fiveY, user, sentByUser)
  }

  async function createSixParcels() {
    await land.assignMultipleParcels(sixX, sixY, user, sentByCreator)
    return createEstate(sixX, sixY, user, sentByUser)
  }

  async function assertMetadata(estateId, requiredMetadata) {
    const metadata = await estate.getMetadata(estateId)
    metadata.should.be.equal(requiredMetadata)
  }

  async function assertNFTBalance(user, expected) {
    const balance = await land.balanceOf(user)
    balance.toString().should.be.equal(expected.toString())
  }

  async function assertEstateSize(estateId, expected) {
    const balance = await estate.getSize(estateId)
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
    return estate.transferToken(estateId, index, anotherUser, who)
  }

  function transferIn(estateId, index, userAddress = anotherUser) {
    let params = sentByAnotherUser

    if (userAddress === user) {
      params = sentByUser
    } else if (userAddress === creator) {
      params = sentByCreator
    }

    return land.safeTransferFromFull(
      userAddress,
      estate.address,
      index,
      estateId,
      params
    )
  }

  function unsafeTransferIn(index, userAddress = anotherUser) {
    return land.transferFrom(
      userAddress,
      estate.address,
      index,
      sentByAnotherUser
    )
  }

  async function assertTokenIdAtIndex(estateId, index, value) {
    const tokenId = await estate.estateTokenIds.call(estateId, index)
    tokenId.toString().should.be.equal(value.toString())
  }

  beforeEach(setupRegistry)

  describe('name', function() {
    it('has a name', async function() {
      const name = await estate.name()
      name.should.be.equal(_name)
    })
  })

  describe('symbol', function() {
    it('has a symbol', async function() {
      const symbol = await estate.symbol()
      symbol.should.be.equal(_symbol)
    })
  })

  describe('update metadata', async function() {
    it('update works correctly', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.updateMetadata(estateId, newMsg, sentByUser)
      await assertMetadata(estateId, newMsg)
    })

    it('unauthorized user can not update', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.updateMetadata(estateId, newMsg, sentByAnotherUser)
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
        estate.transferToken(estateId, 1, yetAnotherUser, sentByAnotherUser)
      )
    })
  })

  describe('transfer tokens', async function() {
    it('owner can transfer tokens in', async function() {
      const estateId = await createUserEstateWithToken1()
      await land.assignMultipleParcels([0], [2], user, sentByCreator)
      await transferIn(estateId, 2, user)
      await assertEstateSize(estateId, 2)
    })

    it('random user can transfer tokens in', async function() {
      const estateId = await createUserEstateWithToken1()
      await land.assignMultipleParcels([0], [2], anotherUser, sentByCreator)
      await transferIn(estateId, 2, anotherUser)
      await assertEstateSize(estateId, 2)
    })

    it('random user can not transfer tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.transferToken(estateId, 1, hacker, sentByAnotherUser)
      )
    })

    it('random user can not transfer many tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await assertRevert(
        estate.transferManyTokens(estateId, [1], hacker, sentByAnotherUser)
      )
    })

    it('owner can transfer tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.transferToken(estateId, 1, anotherUser, sentByUser)
      await assertEstateSize(estateId, 0)
    })

    it('owner can transfer many tokens out', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      await estate.transferManyTokens(
        estateId,
        [1, 2, 3],
        anotherUser,
        sentByUser
      )
      await assertEstateSize(estateId, 2)
    })
  })

  describe('operator transfering tokens', async function() {
    it('operator can transfer tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await transferOut(estateId, 1, sentByAnotherUser)
    })

    it('operator can transfer many tokens out', async function() {
      const estateId = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await estate.transferManyTokens(
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
        estate.transferManyTokens(estateId, [1], anotherUser, sentByAnotherUser)
      )
    })
  })

  describe('order of tokens is correctly accounted', async function() {
    it('five in, middle out, one in, middle out', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      await assertNFTBalance(estate.address, 5)
      await transferOut(estateId, 2)
      await assertTokenIdAtIndex(estateId, 1, 5)
      await transferIn(estateId, 2)
      await assertTokenIdAtIndex(estateId, 4, 2)
      await transferOut(estateId, 3)
      await assertTokenIdAtIndex(estateId, 2, 2)
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
      await assertTokenIdAtIndex(estateId, 0, 2)
      await assertTokenIdAtIndex(estateId, 1, 1)
      await assertTokenIdAtIndex(estateId, 2, 3)
      await assertTokenIdAtIndex(estateId, 3, 4)
      await assertTokenIdAtIndex(estateId, 4, 5)
    })
  })

  describe('tokens are correctly accounted through detection', async function() {
    it('out, unsafe in, check last', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      await transferOut(estateId, 2)
      await unsafeTransferIn(2)
      await assertNFTBalance(estate.address, 5)
      await assertNFTOwner(2, estate.address)
      await assertEstateSize(estateId, 4)
      await estate.ammendReceived(estateId, 2, sentByUser)
      await assertEstateSize(estateId, 5)
      await assertTokenIdAtIndex(estateId, 4, 2)
    })

    it('can be called by anyone', async function() {
      const estateId = await createUserEstateWithNumberedTokens()
      await transferOut(estateId, 2)
      await unsafeTransferIn(2)
      await estate.ammendReceived(estateId, 2, sentByAnotherUser)
      await assertTokenIdAtIndex(estateId, 4, 2)
    })
  })
})
