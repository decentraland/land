import assertRevert from './helpers/assertRevert'
const BigNumber = web3.BigNumber

const LANDRegistry = artifacts.require('LANDRegistryTest')
const LANDProxy = artifacts.require('LANDProxy')

const NONE = '0x0000000000000000000000000000000000000000'

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
  const sentByUser = { from: user }  
  const creationParams = {
    gas: 6e6,
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
          assetIds = await land.assetsOf(anotherUser)
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
      },
      {
        x: -23, y: -23, encoded: '0xffffffffffffffffffffffffffffffe9ffffffffffffffffffffffffffffffe9'
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

    describe('exists', () => {
      it('returns true if the parcel has been assigned', async () => {
        const exists = await land.existsProxy(0, 1) // Truffle still fails to correctly handle function overloading
        exists.should.be.true
      })

      it('returns false if the hasn\'t been assigned', async () => {
        const exists = await land.existsProxy(1, 1)
        exists.should.be.false
      })

      it('throws if invalid coordinates are provided', async () => {
        return Promise.all([land.existsProxy('a', 'b').should.be.rejected])
      })

      it('throws if no coordinates are provided', async () => {
        return Promise.all([land.existsProxy().should.be.rejected])
      })
    })

    describe('landData', () => {
      it('returns an empty string for a freshly-assigned parcel', async () => {
        const data = await land.landData(0, 1)
        data.should.be.equal('')
      })
      
      it('returns land data for a given set of parcel coordinates', async () => {
        await land.authorizeOperator(user, true, sentByUser)
        await land.updateLandData(0, 1, 'test_data', sentByUser)
        const data = await land.landData(0, 1, sentByUser)
        data.should.be.equal('test_data')
      })

      it('returns land data for a parcel that belongs to another holder', async () => {
        await land.assignNewParcel(1, 1, creator, sentByCreator)
        await land.authorizeOperator(creator, true, sentByCreator)
        await land.updateLandData(1, 1, 'test_data', sentByCreator)
        const data = await land.landData(1, 1, sentByUser) // user queries creator's land 
        data.should.be.equal('test_data')
      })

      it('returns an empty string for a set of coordidnates wth no associated parcel', async () => {
        const data = await land.landData(14, 13)
        data.should.be.equal('')
      })

      it('throws if invalid coordinates are provided', async () => {
        return Promise.all([land.landData('a', 'b').should.be.rejected])
      })

      it('throws if no coordinates are provided', async () => {
        return Promise.all([land.landData().should.be.rejected])
      })
    })

  })
})
