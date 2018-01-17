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
  log.args.initializedWith.should.be.equal(
    '0x' + new Buffer(initializedWith).toString('hex')
  )
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('LANDProxy', accounts => {
  const [creator, owner, hacker] = accounts
  let registry = null
  let proxy = null
  const DATA = ''
  const sentByCreator = { from: creator }
  const creationParams = {
    gas: 4e6,
    gasPrice: 21e9,
    from: creator
  }

  beforeEach(async function() {
    proxy = await LANDProxy.new(creationParams)
    registry = await LANDRegistry.new(creationParams)
  })

  describe('upgrade', () => {
    it('should upgrade proxy by owner', async () => {
      const {logs} = await proxy.upgrade(registry.address, DATA, creationParams)
      await checkUpgradeLog(logs[0], registry.address, DATA)
    })

    it('should throw if not owner upgrade proxy', async () => {
      await assertRevert(proxy.upgrade(
        registry.address, DATA, Object.assign(creationParams, {from: hacker})
      ))
    })
  })
})
