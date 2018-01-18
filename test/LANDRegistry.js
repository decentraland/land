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

function checkTransferLog(log, parcelId, from, to) {
  log.event.should.be.eq('Transfer')
  log.args.parcelId.should.be.bignumber.equal(parcelId)
  log.args.from.should.be.equal(from)
  log.args.to.should.be.equal(to)
}

function checkApproveLog(log, parcelId, from, to) {
  log.event.should.be.eq('Approve')
  log.args.parcelId.should.be.bignumber.equal(parcelId)
  log.args.owner.should.be.equal(from)
  log.args.beneficiary.should.be.equal(to)
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('LANDRegistry', accounts => {
  const [creator, user, anotherUser, operator, mallory] = accounts
  let registry = null,
    proxy = null
  let land = null
  const _name = 'Decentraland LAND'
  const _symbol = 'LAND'
  const _firstParcelId = 1
  const _secondParcelId = 2
  const _unknownParcelId = 3
  const sentByCreator = { from: creator }
  const creationParams = {
    gas: 4e6,
    gasPrice: 21e9,
    from: creator
  }

  beforeEach(async function() {
    proxy = await LANDProxy.new(creationParams)
    registry = await LANDRegistry.new(creationParams)

    await proxy.upgrade(registry.address, '', sentByCreator)
    land = await LANDRegistry.at(proxy.address)
    await land.initialize(creator, sentByCreator)
    await land.assignNewParcel(0, 1, user, sentByCreator)
    await land.assignNewParcel(0, 2, user, sentByCreator)
  })

  describe('name', () => {
    it('has a name', async () => {
      const name = await land.name()
      name.should.be.equal(_name)
    })
  })

  describe('symbol', () => {
    it('has a symbol', async () => {
      const symbol = await land.symbol()
      symbol.should.be.equal(_symbol)
    })
  })

  describe('totalSupply', () => {
    it('has a total supply equivalent to the inital supply', async () => {
      const totalSupply = await land.totalSupply()
      totalSupply.should.be.bignumber.equal(2)
    })
    it('has a total supply that increases after creating a new land', async () => {
      let totalSupply = await land.totalSupply()
      totalSupply.should.be.bignumber.equal(2)
      await land.assignNewParcel(-123, 3423, anotherUser, sentByCreator)
      totalSupply = await land.totalSupply()
      totalSupply.should.be.bignumber.equal(3)
    })
  })

  describe('new parcel assignment,', () => {
    describe('one at a time:', () => {
      it('only allows the creator to assign parcels', async () => {
        await assertRevert(land.assignNewParcel(1, 2, user, {
          from: anotherUser
        }))
      })
      it('allows the creator to assign parcels', async () => {
        await land.assignNewParcel(1, 1, user, sentByCreator)
        const owner = await land.ownerOfLand(1, 1)
        owner.should.be.equal(user)
      })
    })

    describe('multiple:', () => {
      describe('successfully registers 10 parcels', async () => {
        const x = []
        const y = []
        const limit = 10
        for (let i = 4; x.length < limit; i*=-2) {
          x.push(i)
        }
        for (let j = -3; y.length < x.length; j*=-3) {
          y.push(j)
        }
        let assetIds
        before(async() => {
          await (land.assignMultipleParcels(x, y, anotherUser, sentByCreator))
          assetIds = await land.allAssetsOf(anotherUser)
        })
        for (let i = 0; i < x.length; i++) {
          it(`works for ${x[i]},${y[i]}`, ((i) => async() => {
            const registeredId = await land.encodeTokenId(x[i], y[i])
            registeredId.should.bignumber.equal(assetIds[i])
          })(i))
        }
      })
    })
  })

  describe('tokenId', () => {
    const values = [
      {
        x: 0, y: 0, encoded: '0x0000000000000000000000000000000000000000000000000000000000000000'
      },
      {
        x: 0, y: 1, encoded: '0x0000000000000000000000000000000000000000000000000000000000000001'
      },
      {
        x: 1, y: 0, encoded: '0x0000000000000000000000000000000100000000000000000000000000000000'
      },
      {
        x: 0, y: -1, encoded: '0x00000000000000000000000000000000ffffffffffffffffffffffffffffffff'
      },
      {
        x: -1, y: -1, encoded: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      },
      {
        x: 0, y: 256, encoded: '0x0000000000000000000000000000000000000000000000000000000000000100'
      },
      {
        x: -256, y: 0, encoded: '0xffffffffffffffffffffffffffffff0000000000000000000000000000000000'
      }
    ]

    describe('encodeTokenId', () => {
      const encodeFn = value => async () => {
        const encoded = new BigNumber(value.encoded)
        const result = await land.encodeTokenId(value.x, value.y)
        result.should.bignumber.equal(encoded)
      }
      for (let value of values) {
        it(`correctly encodes ${value.x},${value.y}`, encodeFn(value))
      }
    })

    describe('decodeTokenId', () => {
      const decodeFn = value => async () => {
        const encoded = new BigNumber(value.encoded)
        const result = await land.decodeTokenId(encoded)

        const [x, y] = result

        x.should.bignumber.equal(value.x)
        y.should.bignumber.equal(value.y)
      }
      for (let value of values) {
        it(`correctly decodes ${value.encoded}`, decodeFn(value))
      }
    })
  })

  describe('getters', () => {
    describe('ownerOfLand', () => {
      it('gets the owner of a parcel of land', async () => {
        const owner = await land.ownerOfLand(0, 1)
        owner.should.be.equal(user)
      })
    })

    describe('ownerOfLandMany', () => {
      it('gets the address of owners for a list of parcels', async () => {
        await land.assignNewParcel(0, 3, anotherUser, sentByCreator)
        const owners = await land.ownerOfLandMany([0, 0, 0], [1, 2, 3])
        owners[0].should.be.equal(user)
        owners[1].should.be.equal(user)
        owners[2].should.be.equal(anotherUser)
      })
    })

    describe('landOf', () => {
      it('gets the parcel coordinates for a certain owner', async () => {
        const [x, y] = await land.landOf(user)
        x[0].should.be.bignumber.equal(0)
        x[1].should.be.bignumber.equal(0)
        y[0].should.be.bignumber.equal(1)
        y[1].should.be.bignumber.equal(2)
      })
    })
  })
})
