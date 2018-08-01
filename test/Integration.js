import assertRevert from './helpers/assertRevert'

const BigNumber = web3.BigNumber

const LANDRegistry = artifacts.require('LANDRegistryTest')
const LANDProxy = artifacts.require('LANDProxy')

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('LANDRegistry', accounts => {
  const [creator, user, anotherUser] = accounts
  let registry = null
  let proxy = null
  let land = null

  const sentByUser = { from: user }
  const sentByCreator = { from: creator }
  const creationParams = {
    gas: 7e6,
    gasPrice: 21e9,
    from: creator
  }

  beforeEach(async function() {
    proxy = await LANDProxy.new(creationParams)
    registry = await LANDRegistry.new(creationParams)

    await proxy.upgrade(registry.address, creator, sentByCreator)
    land = await LANDRegistry.at(proxy.address)
    await land.initialize(creator, sentByCreator)
    await land.authorizeDeploy(creator, sentByCreator)
    await land.ping(sentByUser)
  })

  async function assign({ to, asset, initialValue }) {
    await land.assignNewParcel(0, asset, to, sentByCreator)
    await land.updateLandData(0, asset, initialValue, { from: to })
  }

  async function transfer({ from, to, asset }) {
    await land.transferLand(0, asset, to, { from })
  }

  async function update({ from, asset, value }) {
    await land.updateLandData(0, asset, value, { from })
  }

  const assetOne = 1
  const initialValue = 'initial'
  const newValue = 'new'

  describe('Combinations of calls', () => {
    it('before transfer, update is possible, after, it is not', async () => {
      await assign({ to: user, asset: assetOne, initialValue: initialValue })
      await update({ from: user, asset: assetOne, value: newValue })
      await transfer({ from: user, to: anotherUser, asset: assetOne })
      await assertRevert(
        update({ from: user, asset: assetOne, value: newValue })
      )
    })
    it('before owning, update is impossible, after, it is not', async () => {
      await assign({ to: user, asset: assetOne, initialValue: initialValue })
      await assertRevert(
        update({ from: anotherUser, asset: assetOne, value: newValue })
      )
      await transfer({ from: user, to: anotherUser, asset: assetOne })
      await update({ from: anotherUser, asset: assetOne, value: newValue })
    })
    /**
     * - Setup old contract and test upgrades
     * - Check for updates and
     */
  })
})
