import assertRevert from './helpers/assertRevert'

const BigNumber = web3.BigNumber

const Estate = artifacts.require('EstateRegistry')
const LANDRegistry = artifacts.require('LANDRegistryTest')
const EstateFactory = artifacts.require('EstateFactory')
const LANDProxy = artifacts.require('LANDProxy')

const NONE = '0x0000000000000000000000000000000000000000'

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('EstateRegistry', accounts => {
  const [creator, user, anotherUser, yetAnotherUser, hacker] = accounts

  let registry = null,
    proxy = null
  let land = null
  let estate = null
  let estateFactory = null

  const _name = 'Decentraland LAND'
  const _symbol = 'LAND'

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
    estateFactory = await EstateFactory.new(creationParams)

    await proxy.upgrade(registry.address, creator, sentByCreator)
    land = await LANDRegistry.at(proxy.address)
    await land.initialize(creator, sentByCreator)
    await land.setEstateFactory(estateFactory.address)
  }

  async function createEstate(xs, ys, owner, sendParams) {
    const txReceipt = await land.createEstate(xs, ys, owner, '', sendParams)
    const estateAddr = '0x' + txReceipt.receipt.logs[0].topics[1].slice(26)
    return await Estate.at(estateAddr)
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

  async function assertOperator(estate, address) {
    const operator = await estate.updateOperator.call(estate.address)
    operator.should.be.equal(address)
  }

  async function assertMetadata(estate, requiredMetadata) {
    const metadata = await estate.getMetadata(estate.address)
    metadata.should.be.equal(requiredMetadata)
  }

  async function assertNFTBalance(user, value) {
    const balance = await land.balanceOf(user)
    balance.toString().should.be.equal(value.toString())
  }

  async function assertEstateSize(expected) {
    const balance = await estate.getSize(estate.address)
    balance.toString().should.be.equal(expected.toString())
  }

  async function assertNFTOwner(assetId, expectedOwner) {
    const owner = await land.ownerOf(assetId)
    owner.should.be.equal(expectedOwner)
  }

  async function assertOwner(estate, value) {
    const owner = await estate.owner()
    owner.should.be.equal(value)
  }

  function transferOut(index, who) {
    if (!who) {
        who = sentByUser
    }
    return estate.transferTo(estate.address, index, anotherUser, who)
  }
  function transferIn(index) {
    return land.safeTransferFrom(anotherUser, estate.address, index, sentByAnotherUser)
  }
  function unsafeTransferIn(index) {
    return land.transferFrom(anotherUser, estate.address, index, sentByAnotherUser)
  }
  async function assertTokenIdAtIndex(index, value) {
    const retVal = await estate.assetTokenIds.call(estate.address, index)
    retVal.toString().should.be.equal(value.toString())
  }

  describe('basic creation', () => {
    beforeEach(setupRegistry)

    it('new Estate can be created', async() => {
      await Estate.new('Estate', 'EST', creator, user, sentByCreator)
    })

    it('creation through factory succeeds', async () => {
      await createSixParcels()
      estate = await createEstate([0, 1, -3], [2, 1, 2], user, sentByUser)
      const owned = await estate.getSize(estate.address)
      owned.toString().should.be.equal('3')
    })
  })

  describe('transfer ownership', async () => {
    beforeEach(setupRegistry)

    it('is allowed', async() => {
      estate = await createUserEstateWithToken1()
      await assertOwner(estate, user)
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertOwner(estate, anotherUser)
    })

    xit('clears update operator', async() => {
      estate = await createUserEstateWithToken1()

      await estate.setUpdateOperator(estate.address, yetAnotherUser, sentByUser)

      await estate.transferOwnership(anotherUser, sentByUser)
      await assertOperator(estate, NONE)
    })

    it('old owner can not take tokens out', async() => {
      estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertRevert(estate.transferTo(estate.address, 1, user, sentByUser))
    })

    it('new owner can take tokens out', async() => {
      estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertNFTBalance(estate.address, 1)
      await assertNFTOwner(1, estate.address)
      await estate.transferTo(estate.address, 1, yetAnotherUser, sentByAnotherUser)
      await assertNFTBalance(estate.address, 0)
      await assertNFTBalance(yetAnotherUser, 1)
    })

    it('new owner can not take tokens out before transfer', async() => {
      estate = await createUserEstateWithToken1()
      await assertRevert(estate.transferTo(estate.address, 1, yetAnotherUser, sentByAnotherUser))
      await estate.transferOwnership(anotherUser, sentByUser)
    })

    it('new owner can set operator', async() => {
      estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await estate.setUpdateOperator(estate.address, yetAnotherUser, sentByAnotherUser)
      await assertOperator(estate, yetAnotherUser)
    })

    it('old owner can not set operator', async() => {
      estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertRevert(estate.setUpdateOperator(estate.address, yetAnotherUser, sentByUser))
    })

    it('new owner can not update before transfer', async() => {
      estate = await createUserEstateWithToken1()
      await assertRevert(estate.updateMetadata(estate.address, newMsg, sentByAnotherUser))
      await estate.transferOwnership(anotherUser, sentByUser)
      await estate.updateMetadata(estate.address, newMsg, sentByAnotherUser)
      await assertMetadata(estate, newMsg)
    })

    it('old owner can update before transfer', async() => {
      estate = await createUserEstateWithToken1()
      await estate.updateMetadata(estate.address, newMsg, sentByUser)
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertMetadata(estate, newMsg)
    })

    it('old owner can not update after transfer', async() => {
      estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertRevert(estate.updateMetadata(estate.address, newMsg, sentByUser))
      await assertMetadata(estate, '')
    })

    it('new owner can update after transfer', async() => {
      estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await estate.updateMetadata(estate.address, newMsg, sentByAnotherUser)
      await assertMetadata(estate, newMsg)
    })
  })

  describe('update metadata', async () => {
    beforeEach(setupRegistry)

    it('update works correctly', async () => {
      estate = await createUserEstateWithToken1()
      await estate.updateMetadata(estate.address, newMsg, sentByUser)
      await assertMetadata(estate, newMsg)
    })
    it('unauthorized user can not update', async () => {
      estate = await createUserEstateWithToken1()
      await assertRevert(estate.updateMetadata(estate.address, newMsg, sentByAnotherUser))
    })
    it('unauthorized user can not set update operator', async () => {
      estate = await createUserEstateWithToken1()
      await assertRevert(estate.setUpdateOperator(estate.address, yetAnotherUser, sentByAnotherUser))
    })
    it('update operator can not transfer tokens out', async () => {
      estate = await createUserEstateWithToken1()
      await estate.setUpdateOperator(estate.address, anotherUser, sentByUser)
      await assertRevert(estate.transferTo(estate.address, 1, yetAnotherUser, sentByAnotherUser))
    })
  })

  describe('transfer tokens', async () => {
    beforeEach(setupRegistry)

    it('owner can transfer tokens in', async () => {
      estate = await createUserEstateWithToken1()
      await land.assignMultipleParcels([0], [2], user, sentByCreator)
      await land.safeTransferFrom(user, estate.address, 2, sentByUser)
      await assertEstateSize(2)
    })

    it('random user can transfer tokens in', async () => {
      estate = await createUserEstateWithToken1()
      await land.assignMultipleParcels([0], [2], anotherUser, sentByCreator)
      await land.safeTransferFrom(anotherUser, estate.address, 2, sentByAnotherUser)
      await assertEstateSize(2)
    })

    it('random user can not transfer tokens out', async () => {
      estate = await createUserEstateWithToken1()
      await assertRevert(estate.transferTo(estate.address, 1, hacker, sentByAnotherUser))
    })

    it('random user can not transfer many tokens out', async () => {
      estate = await createUserEstateWithToken1()
      await assertRevert(estate.transferMany(estate.address, [1], hacker, sentByAnotherUser))
    })

    it('owner can transfer tokens out', async () => {
      estate = await createUserEstateWithToken1()
      await estate.transferTo(estate.address, 1, anotherUser, sentByUser)
      await assertEstateSize(0)
    })

    it('owner can transfer many tokens out', async () => {
      estate = await createUserEstateWithNumberedTokens()
      await estate.transferMany(estate.address, [1, 2, 3], anotherUser, sentByUser)
      await assertEstateSize(2)
    })
  })

  describe('operator transfering tokens', async () => {
    beforeEach(setupRegistry)

    it('operator can transfer tokens in', async () => {
      estate = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await land.assignMultipleParcels([0], [2], anotherUser, sentByCreator)
      await transferIn(2)
      await assertEstateSize(2)
    })

    it('operator can transfer tokens out', async () => {
      estate = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await transferOut(1, sentByAnotherUser)
    })

    it('operator can transfer many tokens out', async () => {
      estate = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await estate.transferMany(estate.address, [1], anotherUser, sentByAnotherUser)
    })

    it('operator can not transfer tokens out after deauth', async () => {
      estate = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await transferOut(1, sentByAnotherUser)
      await transferIn(1)
      await estate.setApprovalForAll(anotherUser, false, sentByUser)
      await assertRevert(transferOut(1, sentByAnotherUser))
    })

    it('operator can not transfer many tokens out after deauth', async () => {
      estate = await createUserEstateWithToken1()
      await estate.setApprovalForAll(anotherUser, true, sentByUser)
      await transferOut(1, sentByAnotherUser)
      await transferIn(1)
      await estate.setApprovalForAll(anotherUser, false, sentByUser)
      await assertRevert(estate.transferMany(estate.address, [1], anotherUser, sentByAnotherUser))
    })
  })


  describe('order of tokens is correctly accounted', async () => {
    beforeEach(setupRegistry)

    it('five in, middle out, one in, middle out', async () => {
      estate = await createUserEstateWithNumberedTokens()
      await assertNFTBalance(estate.address, 5)
      await transferOut(2)
      await assertTokenIdAtIndex(1, 5)
      await transferIn(2)
      await assertTokenIdAtIndex(4, 2)
      await transferOut(3)
      await assertTokenIdAtIndex(2, 2)
    })

    it('five in, empty, refill', async () => {
      estate = await createUserEstateWithNumberedTokens()
      await transferOut(2)
      await transferOut(1)
      await transferOut(3)
      await transferOut(4)
      await transferOut(5)
      await assertNFTBalance(estate.address, 0)
      await transferIn(2)
      await transferIn(1)
      await transferIn(3)
      await transferIn(4)
      await transferIn(5)
      await assertNFTBalance(estate.address, 5)
      await assertTokenIdAtIndex(0, 2)
      await assertTokenIdAtIndex(1, 1)
      await assertTokenIdAtIndex(2, 3)
      await assertTokenIdAtIndex(3, 4)
      await assertTokenIdAtIndex(4, 5)
    })
  })

  describe('tokens are correctly accounted through detection', async () => {
    beforeEach(setupRegistry)

    it('out, unsafe in, check last', async () => {
      estate = await createUserEstateWithNumberedTokens()
      await transferOut(2)
      await unsafeTransferIn(2)
      await assertNFTBalance(estate.address, 5)
      await assertNFTOwner(2, estate.address)
      await assertEstateSize(4)
      await estate.ammendReceived(estate.address, 2, sentByUser)
      await assertEstateSize(5)
      await assertTokenIdAtIndex(4, 2)
    })

    it('can be called by anyone', async () => {
      estate = await createUserEstateWithNumberedTokens()
      await transferOut(2)
      await unsafeTransferIn(2)
      await estate.ammendReceived(estate.address, 2, sentByAnotherUser)
      await assertTokenIdAtIndex(4, 2)
    })
  })
})
