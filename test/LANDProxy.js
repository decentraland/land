import assertRevert from './helpers/assertRevert'

const LANDRegistry = artifacts.require(
  'contracts/land/LANDRegistry.sol:LANDRegistry'
)
const LANDProxy = artifacts.require('LANDProxy')

function checkUpgradeLog(log, newContract, initializedWith) {
  log.event.should.be.eq('Upgrade')
  log.args.newContract.toLowerCase().should.be.equal(newContract.toLowerCase())
  log.args.initializedWith
    .toLowerCase()
    .should.be.equal(initializedWith.toLowerCase())
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('./helpers/chaiBn'))
  .should()

contract('LANDProxy', accounts => {
  const [creator, hacker, otherOwner] = accounts
  let registry = null
  let proxy = null
  let land = null

  const creationParams = {
    gas: 7e6,
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
        creator,
        creationParams
      )
      await checkUpgradeLog(logs[0], registry.address, creator)

      const landName = await land.name()
      landName.should.be.equal('Decentraland LAND')

      const proxyOwner = await land.proxyOwner()
      proxyOwner.should.be.equal(creator)

      const ownerAddress = await land.owner()
      ownerAddress.should.be.equal(creator)
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

    it('should transfer ownership', async () => {
      await proxy.transferOwnership(otherOwner, { from: creator })
      const newOwner = await proxy.proxyOwner()
      newOwner.should.be.equal(otherOwner)
    })

    it('should throw if transfering to address 0x0', async () => {
      await assertRevert(
        proxy.transferOwnership('0x0000000000000000000000000000000000000000', {
          from: creator
        })
      )
    })

    it('should throw if trying to transfer and not owner', async () => {
      await assertRevert(proxy.transferOwnership(otherOwner, { from: hacker }))
    })
  })
})
