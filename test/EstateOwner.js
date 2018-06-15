import assertRevert from './helpers/assertRevert'

const BigNumber = web3.BigNumber

const Estate = artifacts.require('EstateOwner')
const LANDRegistry = artifacts.require('LANDRegistryTest')
const EstateFactory = artifacts.require('EstateFactory')
const LANDProxy = artifacts.require('LANDProxy')

const NONE = '0x0000000000000000000000000000000000000000'

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('EstateOwner', accounts => {
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

  async function createSixParcels() {
    return land.assignMultipleParcels(
      sixX,
      sixY,
      user,
      sentByCreator,
    )
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

  async function assertOperator(estate, address) {
    const operator = await estate.operator.call()
    operator.should.be.equal(address)
  }

  async function assertMetadata(estate, requiredMetadata) {
    const metadata = await estate.getMetadata(0)
    metadata.should.be.equal(requiredMetadata)
  }

  async function assertNFTBalance(user, value) {
    const balance = await land.balanceOf(user)
    balance.toString().should.be.equal(value.toString())
  }

  async function assertNFTOwner(assetId, expectedOwner) {
    const owner = await land.ownerOf(assetId)
    owner.should.be.equal(expectedOwner)
  }

  async function assertOwner(estate, value) {
    const owner = await estate.owner()
    owner.should.be.equal(value)
  }

  describe('basic creation', () => {

    beforeEach(setupRegistry)

    it('new Estate can be created', async() => {
      await Estate.new(creator, user, sentByCreator)
    })

    it('creation through factory succeeds', async () => {
      await createSixParcels()
      const estate = await createEstate([0, 1, -3], [2, 1, 2], user, sentByUser)
      const owned = await estate.size()
      owned.toString().should.be.equal('3')
    })
  })

  describe.only('transfer ownership', async () => {
    beforeEach(setupRegistry)

    it('is allowed', async() => {
      const estate = await createUserEstateWithToken1()
      await assertOwner(estate, user)
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertOwner(estate, anotherUser)
    })

    it('clears update operator', async() => {
      const estate = await createUserEstateWithToken1()

      await estate.setUpdateOperator(yetAnotherUser, sentByUser)

      await estate.transferOwnership(anotherUser, sentByUser)
      await assertOperator(estate, NONE)
    })
    it('old owner can not take tokens out', async() => {
      const estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertRevert(estate.transferTo(1, user, sentByUser))
    })
    it('new owner can take tokens out', async() => {
      const estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertNFTBalance(estate.address, 1)
      await assertNFTOwner(1, estate.address)
      await estate.transferTo(1, yetAnotherUser, sentByAnotherUser)
      await assertNFTBalance(estate.address, 0)
      await assertNFTBalance(yetAnotherUser, 1)
    })
    it('new owner can not take tokens out before transfer', async() => {
      const estate = await createUserEstateWithToken1()
      await assertRevert(estate.transferTo(1, yetAnotherUser, sentByAnotherUser))
      await estate.transferOwnership(anotherUser, sentByUser)
    })
    it('new owner can set operator', async() => {
      const estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await estate.setUpdateOperator(yetAnotherUser, sentByAnotherUser)
      await assertOperator(estate, yetAnotherUser)
    })
    it('old owner can not set operator', async() => {
      const estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertRevert(estate.setUpdateOperator(yetAnotherUser, sentByUser))
    })
    it('new owner can not update before transfer', async() => {
      const estate = await createUserEstateWithToken1()
      await assertRevert(estate.updateMetadata(newMsg, sentByAnotherUser))
      await estate.transferOwnership(anotherUser, sentByUser)
      await estate.updateMetadata(newMsg, sentByAnotherUser)
      await assertMetadata(estate, newMsg)
    })
    it('old owner can update before transfer', async() => {
      const estate = await createUserEstateWithToken1()
      await estate.updateMetadata(newMsg, sentByUser)
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertMetadata(estate, newMsg)
    })
    it('old owner can not update after transfer', async() => {
      const estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await assertRevert(estate.updateMetadata(newMsg, sentByUser))
      await assertMetadata(estate, '')
    })
    it('new owner can update after transfer', async() => {
      const estate = await createUserEstateWithToken1()
      await estate.transferOwnership(anotherUser, sentByUser)
      await estate.updateMetadata(newMsg, sentByAnotherUser)
      await assertMetadata(estate, newMsg)
    })
  })

  describe('update metadata', async () => {
    beforeEach(setupRegistry)
    it('update works correctly', async () => {
    })
    it('unauthorized user can not update', async () => {
    })
    it('unauthorized user can not set update operator', async () => {
    })
    it('update operator can not transfer tokens out', async () => {
    })
    it('update operator can not transfer tokens out', async () => {
    })
  })

  describe('transfer tokens', async () => {
    beforeEach(setupRegistry)
    it('owner can transfer tokens in', async () => {
    })
    it('random user can transfer tokens in', async () => {
    })
    it('random user can not transfer tokens out', async () => {
    })
    it('random user can not transfer many tokens out', async () => {
    })
    it('owner can transfer tokens out', async () => {
    })
    it('owner can transfer many tokens out', async () => {
    })
  })

  describe('order of tokens is correctly accounted', async () => {
    beforeEach(setupRegistry)
    it('three in, middle out, one in, middle out', async () => {
    })
    it('three in, first out, one in, middle out', async () => {
    })
  })

  describe('order of tokens is correctly accounted through detection', async () => {
    beforeEach(setupRegistry)
    it('three in, middle out, one in, middle out', async () => {
    })
    it('three in, first out, one in, middle out', async () => {
    })
  })
})
