/**
 * Ported over from zeppelin-solidity tests for NonFungibleland.sol
 *
 * Given that the test is mostly for common functionality, it should work mostly as-is.
 *
 * Deleted functionality: `burn`
 */
import assertRevert from './helpers/assertRevert'
const BigNumber = web3.BigNumber

const LANDRegistry = artifacts.require('LANDRegistry')
const LANDProxy = artifacts.require('LANDProxy')

const NONE = '0x0000000000000000000000000000000000000000'

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
  const [creator, owner, hacker] = accounts
  let registry = null
  let proxy = null
  let land = null

  const sentByCreator = { from: creator }
  const creationParams = {
    gas: 4e6,
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
      const {logs} = await proxy.upgrade(registry.address, owner, creationParams)
      await checkUpgradeLog(logs[0], registry.address, owner)
      const landName = await land.name()
      landName.should.be.equal('Decentraland LAND')
      const ownerAddress = await land.owner()
      ownerAddress.should.be.equal(owner)
      const proxyOwner = await land.proxyOwner()
      proxyOwner.should.be.equal(creator)
    })

    it('should throw if not owner upgrade proxy', async () => {
      await assertRevert(proxy.upgrade(
        registry.address, hacker, Object.assign({}, creationParams, {from: hacker})
      ))
    })
  })
})
