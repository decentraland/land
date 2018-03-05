import assertRevert from './helpers/assertRevert'
const BigNumber = web3.BigNumber

const LANDRegistry = artifacts.require('LANDRegistry')
const LANDProxy = artifacts.require('LANDProxy')

function checkUpgradeLog(log, newContract, initializedWith) {
  log.event.should.be.eq('Upgrade')
  log.args.newContract.should.be.equal(newContract)
  log.args.initializedWith.should.be.equal(initializedWith)
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('LANDProxy', accounts => {
  const [creator, owner, hacker, otherOwner] = accounts
  let registry = null
  let proxy = null
  let land = null

  const creationParams = {
    gas: 6e6,
    gasPrice: 21e9,
    from: creator
  }

  describe('upgrade', () => {
    beforeEach(async function() {
      proxy = await LANDProxy.new(creationParams)
      registry = await LANDRegistry.new(creationParams)
      land = await LANDRegistry.at(proxy.address)
    })

    it('should upgrade proxy by owner', async () => {
      const { logs } = await proxy.upgrade(
        registry.address,
        owner,
        creationParams
      )
      await checkUpgradeLog(logs[0], registry.address, owner)
      const landName = await land.name()
      landName.should.be.equal('Decentraland LAND')
      const ownerAddress = await land.owner()
      ownerAddress.should.be.equal(creator)
      const proxyOwner = await land.proxyOwner()
      proxyOwner.should.be.equal(creator)
    })

    it('should throw if not owner upgrade proxy', async () => {
      await assertRevert(
        proxy.upgrade(
          registry.address,
          hacker,
          Object.assign({}, creationParams, { from: hacker })
        )
      )
    })

    it('transfer ownership should not change owner until accepted', async () => {
      await proxy.transferOwnership(otherOwner, { from: creator })
      const oldOwner = await proxy.proxyOwner()
      oldOwner.should.be.equal(creator)
    })

    it('should transfer ownership when new owner accepts', async () => {
      await proxy.transferOwnership(otherOwner, { from: creator })
      await proxy.acceptOwnership({ from: otherOwner })
      const newOwner = await proxy.proxyOwner()
      newOwner.should.be.equal(otherOwner)
    })

    it('should throw if accepting ownership and not owner', async () => {
      await proxy.transferOwnership(otherOwner, { from: creator })
      await assertRevert(proxy.acceptOwnership({ from: hacker }))
    })

    it('should throw if trying to transfer and not owner', async () => {
      await assertRevert(proxy.transferOwnership(otherOwner, { from: hacker }))
    })
  })
})
