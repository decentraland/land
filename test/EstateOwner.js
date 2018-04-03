import assertRevert from './helpers/assertRevert'
import { increaseTimeTo, duration, latestTime } from './helpers/increaseTime'

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
  const [creator, user, anotherUser] = accounts

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

  describe('workflow full', () => {
    it('new Estate can be created', async() => {
      await Estate.new(creator, user, sentByCreator)
    })

    it.only('allows a estate to establish ownership', async () => {
      proxy = await LANDProxy.new(creationParams)
      registry = await LANDRegistry.new(creationParams)
      estateFactory = await EstateFactory.new(creationParams)

      await proxy.upgrade(registry.address, creator, sentByCreator)
      land = await LANDRegistry.at(proxy.address)
      await land.initialize(creator, sentByCreator)
      await land.setEstateFactory(estateFactory.address)

      await land.assignMultipleParcels(
        [0, 0, 1, 1, -3, -4],
        [2, -1, 1, -2, 2, 2],
        user,
        sentByCreator
      )

      const txReceipt = await land.createEstate([0, 1, -3], [2, 1, 2], user, '', sentByUser)
      const estateAddr = '0x' + txReceipt.receipt.logs[0].topics[1].slice(26)
      estate = await Estate.at(estateAddr)

      await estate.transferOwnership(anotherUser, sentByUser)

      const newMsg = 'new land content'
      await estate.updateMetadata(newMsg, sentByAnotherUser)

      const data = await land.landData.call(0, 2)
      data.should.be.equal(newMsg)
    })
  })
})
