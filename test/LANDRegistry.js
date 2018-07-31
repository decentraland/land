import assertRevert from './helpers/assertRevert'
import setupContracts, {
  LAND_NAME,
  LAND_SYMBOL
} from './helpers/setupContracts'

const BigNumber = web3.BigNumber

const NONE = '0x0000000000000000000000000000000000000000'

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('LANDRegistry', accounts => {
  const [creator, user, anotherUser, operator, hacker] = accounts

  let contracts = null
  let registry = null
  let proxy = null
  let estate = null
  let land = null

  const creationParams = {
    gas: 7e6,
    gasPrice: 1e9,
    from: creator
  }
  const sentByUser = { from: user }
  const sentByCreator = { from: creator }

  beforeEach(async function() {
    contracts = await setupContracts(creator, creationParams)
    proxy = contracts.proxy
    registry = contracts.registry
    estate = contracts.estate
    land = contracts.land

    await land.authorizeDeploy(creator, sentByCreator)
    await land.assignNewParcel(0, 1, user, sentByCreator)
    await land.assignNewParcel(0, 2, user, sentByCreator)
    await land.ping(sentByUser)
  })

  describe('name', function() {
    it('has a name', async function() {
      const name = await land.name()
      name.should.be.equal(LAND_NAME)
    })
  })

  describe('symbol', function() {
    it('has a symbol', async function() {
      const symbol = await land.symbol()
      symbol.should.be.equal(LAND_SYMBOL)
    })
  })

  describe('totalSupply', function() {
    it('has a total supply equivalent to the inital supply', async function() {
      const totalSupply = await land.totalSupply()
      totalSupply.should.be.bignumber.equal(2)
    })
    it('has a total supply that increases after creating a new land', async function() {
      let totalSupply = await land.totalSupply()
      totalSupply.should.be.bignumber.equal(2)
      await land.assignNewParcel(-123, 3423, anotherUser, sentByCreator)
      totalSupply = await land.totalSupply()
      totalSupply.should.be.bignumber.equal(3)
    })
  })

  describe('new parcel assignment,', function() {
    describe('one at a time:', function() {
      it('only allows the creator to assign parcels', async function() {
        await assertRevert(
          land.assignNewParcel(1, 2, user, { from: anotherUser })
        )
      })

      it('allows the creator to assign parcels', async function() {
        await land.assignNewParcel(1, 1, user, sentByCreator)
        const owner = await land.ownerOfLand(1, 1)
        owner.should.be.equal(user)
      })
    })

    describe('multiple', function() {
      describe('successfully registers 10 parcels', async function() {
        const x = []
        const y = []
        const limit = 10
        for (let i = 4; x.length < limit; i *= -2) {
          x.push(i)
        }
        for (let j = -3; y.length < x.length; j *= -3) {
          y.push(j)
        }
        let assetIds

        before(async function() {
          await land.assignMultipleParcels(x, y, anotherUser, sentByCreator)
          assetIds = await land.tokensOf(anotherUser)
        })

        for (let i = 0; i < x.length; i++) {
          it(
            `works for ${x[i]},${y[i]}`,
            (i => async () => {
              const registeredId = await land.encodeTokenId(x[i], y[i])
              registeredId.should.bignumber.equal(assetIds[i])
            })(i)
          )
        }
      })
    })
  })

  describe('tokenId', function() {
    const values = [
      {
        x: 0,
        y: 0,
        encoded:
          '0x0000000000000000000000000000000000000000000000000000000000000000'
      },
      {
        x: 0,
        y: 1,
        encoded:
          '0x0000000000000000000000000000000000000000000000000000000000000001'
      },
      {
        x: 1,
        y: 0,
        encoded:
          '0x0000000000000000000000000000000100000000000000000000000000000000'
      },
      {
        x: 0,
        y: -1,
        encoded:
          '0x00000000000000000000000000000000ffffffffffffffffffffffffffffffff'
      },
      {
        x: -1,
        y: -1,
        encoded:
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      },
      {
        x: 0,
        y: 256,
        encoded:
          '0x0000000000000000000000000000000000000000000000000000000000000100'
      },
      {
        x: -256,
        y: 0,
        encoded:
          '0xffffffffffffffffffffffffffffff0000000000000000000000000000000000'
      },
      {
        x: -23,
        y: -23,
        encoded:
          '0xffffffffffffffffffffffffffffffe9ffffffffffffffffffffffffffffffe9'
      }
    ]

    describe('encodeTokenId', function() {
      const encodeFn = value =>
        async function() {
          const encoded = new BigNumber(value.encoded)
          const result = await land.encodeTokenId(value.x, value.y)
          result.should.bignumber.equal(encoded)
        }
      for (let value of values) {
        it(`correctly encodes ${value.x},${value.y}`, encodeFn(value))
      }
    })

    describe('decodeTokenId', function() {
      const decodeFn = value =>
        async function() {
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

  describe('getters', function() {
    describe('ownerOfLand', function() {
      it('gets the owner of a parcel of land', async function() {
        const owner = await land.ownerOfLand(0, 1)
        owner.should.be.equal(user)
      })
    })

    describe('ownerOfLandMany', function() {
      it('gets the address of owners for a list of parcels', async function() {
        await land.assignNewParcel(0, 3, anotherUser, sentByCreator)
        const owners = await land.ownerOfLandMany([0, 0, 0], [1, 2, 3])
        owners[0].should.be.equal(user)
        owners[1].should.be.equal(user)
        owners[2].should.be.equal(anotherUser)
      })
    })

    describe('landOf', function() {
      it('gets the parcel coordinates for a certain owner', async function() {
        const [x, y] = await land.landOf(user)
        x[0].should.be.bignumber.equal(0)
        x[1].should.be.bignumber.equal(0)
        y[0].should.be.bignumber.equal(1)
        y[1].should.be.bignumber.equal(2)
      })
    })

    describe('exists', function() {
      it('returns true if the parcel has been assigned', async function() {
        const exists = await land.existsProxy(0, 1) // Truffle still fails to correctly handle function overloading
        exists.should.be.true
      })

      it('returns false if the has not been assigned', async function() {
        const exists = await land.existsProxy(1, 1)
        exists.should.be.false
      })

      it('throws if invalid coordinates are provided', async function() {
        return Promise.all([land.existsProxy('a', 'b').should.be.rejected])
      })

      it('throws if no coordinates are provided', async function() {
        return Promise.all([land.existsProxy().should.be.rejected])
      })
    })

    describe('landData', function() {
      it('returns an empty string for a freshly-assigned parcel', async function() {
        const data = await land.landData(0, 1)
        data.should.be.equal('')
      })

      it('allows updating your own land data', async function() {
        await land.updateLandData(0, 1, 'test_data', sentByUser)
        const data = await land.landData(0, 1, sentByUser)
        data.should.be.equal('test_data')
      })

      it('throws if updating another user land data', async function() {
        await assertRevert(
          land.updateLandData(0, 1, 'test_data', sentByCreator)
        )
      })

      it('allow updating land data if given authorization', async function() {
        await land.setUpdateOperator(1, creator, sentByUser)
        await land.updateLandData(0, 1, 'test_data', sentByCreator)
      })

      it('returns land data for a parcel that belongs to another holder', async function() {
        const tokenId = await land.encodeTokenId(1, 1)
        await land.assignNewParcel(1, 1, creator, sentByCreator)
        await land.setUpdateOperator(tokenId, user, sentByCreator)
        await land.updateLandData(1, 1, 'test_data', sentByUser)
        const data = await land.landData(1, 1, sentByCreator) // user queries creator's land
        data.should.be.equal('test_data')
      })

      it('returns an empty string for a set of coordidnates with no associated parcel', async function() {
        const data = await land.landData(14, 13)
        data.should.be.equal('')
      })

      it('throws if invalid coordinates are provided', async function() {
        return Promise.all([land.landData('a', 'b').should.be.rejected])
      })

      it('throws if no coordinates are provided', async function() {
        return Promise.all([land.landData().should.be.rejected])
      })
    })

    describe('updateLandData', function() {
      it('updates the parcel data if authorized', async function() {
        await land.setUpdateOperator(1, user, sentByUser)
        const originalData = await land.landData(0, 1, sentByUser)
        originalData.should.be.equal('')
        await land.updateLandData(0, 1, 'test_data', sentByUser)
        const data = await land.landData(0, 1, sentByUser)
        data.should.be.equal('test_data')
      })

      it('sets an empty string if invalid data is provided', async function() {
        await land.setUpdateOperator(1, user, sentByUser)

        const originalData = await land.landData(0, 1, sentByUser)
        originalData.should.be.equal('')

        await land.updateLandData(0, 1, 'test-data', sentByUser)
        const intermediateData = await land.landData(0, 1, sentByUser)
        intermediateData.should.be.equal('test-data')

        await land.updateLandData(0, 1, 999, sentByUser)
        const finalData = await land.landData(0, 1, sentByUser)
        finalData.should.be.equal('')
      })

      it('reverts if the sender is not an authorized operator', async function() {
        await assertRevert(
          land.updateLandData(1, 1, 'test_data', sentByCreator)
        )
      })

      it('emits Update event on LAND update', async function() {
        const data = 'test_data'
        const { logs } = await land.updateLandData(0, 1, data, sentByUser)

        // Event emitted
        const assetId = await land.encodeTokenId(0, 1)
        logs.length.should.be.equal(1)

        const log = logs[0]
        log.event.should.be.eq('Update')
        log.args.assetId.should.be.bignumber.equal(assetId)
        log.args.holder.should.be.equal(user)
        log.args.operator.should.be.equal(user)
        log.args.data.should.be.equal(data)
      })
    })

    describe('authorizeDeploy', function() {
      it('authorizes an address', async function() {
        await land.authorizeDeploy(user)
        const isAuthorized = await land.isDeploymentAuthorized(user)
        isAuthorized.should.be.true
      })

      it('verifies that deployments are not authorized by default', async function() {
        const isAuthorized = await land.isDeploymentAuthorized(user)
        isAuthorized.should.be.false
      })

      it('authorizes an address twice without reverting', async function() {
        await land.authorizeDeploy(user)
        await land.authorizeDeploy(user)
        const isAuthorized = await land.isDeploymentAuthorized(user)
        isAuthorized.should.be.true
      })

      it('reverts if the sender is not the owner', async function() {
        await assertRevert(land.authorizeDeploy(user, sentByUser))
      })

      it('throws if provided with an invalid address', async function() {
        await assertRevert(land.authorizeDeploy(NONE)).should.be.rejected
      })

      it('should use proxy owner to validate deploy call', async function() {
        await land.initialize(hacker, { from: hacker })
        await assertRevert(land.authorizeDeploy(hacker, { from: hacker }))
      })

      it('should use proxy owner to validate forbid call', async function() {
        await land.initialize(hacker, { from: hacker })
        await assertRevert(land.forbidDeploy(hacker, { from: hacker }))
      })
    })

    describe('forbidDeploy', function() {
      it('forbids the deployment for an specific address', async function() {
        await land.forbidDeploy(user)
        const isAuthorized = await land.isDeploymentAuthorized(user)
        isAuthorized.should.be.false
      })

      it('forbids the deployment for an specific address twice without reverting', async function() {
        await land.forbidDeploy(user)
        await land.forbidDeploy(user)
        const isAuthorized = await land.isDeploymentAuthorized(user)
        isAuthorized.should.be.false
      })

      it('forbids the deployment for an specific address after authorization', async function() {
        await land.authorizeDeploy(user)
        const isAuthorized = await land.isDeploymentAuthorized(user)
        isAuthorized.should.be.true

        await land.forbidDeploy(user)
        const isAuthorizedFinal = await land.isDeploymentAuthorized(user)
        isAuthorizedFinal.should.be.false
      })

      it('reverts if the sender is not the owner', async function() {
        await assertRevert(land.forbidDeploy(user, sentByUser))
      })

      it('throws if provided with an invalid address', async function() {
        return Promise.all([
          assertRevert(land.forbidDeploy(NONE)).should.be.rejected
        ])
      })
    })
  })

  describe('Transfers', function() {
    describe('transferLand', function() {
      it('transfers land if it is called by owner', async function() {
        const [xUser, yUser] = await land.landOf(user)
        xUser[0].should.be.bignumber.equal(0)
        xUser[1].should.be.bignumber.equal(0)
        yUser[0].should.be.bignumber.equal(1)
        yUser[1].should.be.bignumber.equal(2)

        await land.transferLand(0, 1, creator, sentByUser)
        const [xCreator, yCreator] = await land.landOf(creator)
        const [xNewUser, yNewUser] = await land.landOf(user)

        xCreator[0].should.be.bignumber.equal(0)
        yCreator[0].should.be.bignumber.equal(1)
        xCreator.length.should.be.equal(1)
        yCreator.length.should.be.equal(1)

        xNewUser[0].should.be.bignumber.equal(0)
        yNewUser[0].should.be.bignumber.equal(2)
        xNewUser.length.should.be.equal(1)
        yNewUser.length.should.be.equal(1)
      })

      it('transfers land if it is called by operator', async function() {
        const [xUser, yUser] = await land.landOf(user)
        xUser[0].should.be.bignumber.equal(0)
        xUser[1].should.be.bignumber.equal(0)
        yUser[0].should.be.bignumber.equal(1)
        yUser[1].should.be.bignumber.equal(2)

        await land.setApprovalForAll(operator, true, sentByUser)
        await land.transferLand(0, 1, creator, { from: operator })
        const [xCreator, yCreator] = await land.landOf(creator)
        const [xNewUser, yNewUser] = await land.landOf(user)

        xCreator[0].should.be.bignumber.equal(0)
        yCreator[0].should.be.bignumber.equal(1)
        xCreator.length.should.be.equal(1)
        yCreator.length.should.be.equal(1)

        xNewUser[0].should.be.bignumber.equal(0)
        yNewUser[0].should.be.bignumber.equal(2)
        xNewUser.length.should.be.equal(1)
        yNewUser.length.should.be.equal(1)
      })

      it('does not transfer land if it is called by not authorized operator', async function() {
        await assertRevert(land.transferLand(0, 1, creator, { from: operator }))
      })

      it('does not transfer land if land does not exist', async function() {
        await assertRevert(land.transferLand(1, 1, creator, sentByUser))
      })
    })

    describe('transferManyLand', function() {
      it('transfers lands if it is called by owner', async function() {
        const [xUser, yUser] = await land.landOf(user)
        xUser[0].should.be.bignumber.equal(0)
        xUser[1].should.be.bignumber.equal(0)
        yUser[0].should.be.bignumber.equal(1)
        yUser[1].should.be.bignumber.equal(2)

        await land.transferManyLand(xUser, yUser, creator, sentByUser)
        const [xCreator, yCreator] = await land.landOf(creator)
        const [xNewUser, yNewUser] = await land.landOf(user)

        xCreator[0].should.be.bignumber.equal(0)
        xCreator[1].should.be.bignumber.equal(0)
        yCreator[0].should.be.bignumber.equal(1)
        yCreator[1].should.be.bignumber.equal(2)
        xCreator.length.should.be.equal(2)
        yCreator.length.should.be.equal(2)

        xNewUser.length.should.be.equal(0)
        yNewUser.length.should.be.equal(0)
      })

      it('transfers lands if it is called by operator', async function() {
        const [xUser, yUser] = await land.landOf(user)
        xUser[0].should.be.bignumber.equal(0)
        xUser[1].should.be.bignumber.equal(0)
        yUser[0].should.be.bignumber.equal(1)
        yUser[1].should.be.bignumber.equal(2)

        await land.setApprovalForAll(operator, true, sentByUser)
        await land.transferManyLand(xUser, yUser, creator, { from: operator })
        const [xCreator, yCreator] = await land.landOf(creator)
        const [xNewUser, yNewUser] = await land.landOf(user)

        xCreator[0].should.be.bignumber.equal(0)
        xCreator[1].should.be.bignumber.equal(0)
        yCreator[0].should.be.bignumber.equal(1)
        yCreator[1].should.be.bignumber.equal(2)
        xCreator.length.should.be.equal(2)
        yCreator.length.should.be.equal(2)

        xNewUser.length.should.be.equal(0)
        yNewUser.length.should.be.equal(0)
      })

      it('does not transfer lands if it is called by not authorized operator', async function() {
        const [xUser, yUser] = await land.landOf(user)
        await assertRevert(
          land.transferManyLand(xUser, yUser, creator, { from: operator })
        )
      })

      it('does not transfer lands if land does not exist', async function() {
        await assertRevert(
          land.transferManyLand([12, 4], [1, 2], creator, sentByUser)
        )
      })

      it('does not transfer lands if x length is not equal to y length', async function() {
        await assertRevert(
          land.transferManyLand([0, 0], [0, 1, 3], creator, sentByUser)
        )
      })
    })
  })

  // describe('transfer land to estate', function() {
  //   describe('transferLandToEstate', function() {
  //     it('transfers land if it is called by owner', async function() {
  //       const [xUser, yUser] = await land.landOf(user)
  //       xUser[0].should.be.bignumber.equal(0)
  //       xUser[1].should.be.bignumber.equal(0)
  //       yUser[0].should.be.bignumber.equal(1)
  //       yUser[1].should.be.bignumber.equal(2)

  //       await land.transferLandToEstate(0, 1, sentByUser)
  //       const [xEstate, yEstate] = await land.landOf(estate.address)
  //       const [xNewUser, yNewUser] = await land.landOf(user)

  //       xEstate[0].should.be.bignumber.equal(0)
  //       yEstate[0].should.be.bignumber.equal(1)
  //       xEstate.length.should.be.equal(1)
  //       yEstate.length.should.be.equal(1)

  //       xNewUser[0].should.be.bignumber.equal(0)
  //       yNewUser[0].should.be.bignumber.equal(2)
  //       xNewUser.length.should.be.equal(1)
  //       yNewUser.length.should.be.equal(1)
  //     })
  //   })
  // })

  describe('update authorized', function() {
    it('update not allowed before setUpdateOperator', async function() {
      await assertRevert(land.updateLandData(0, 1, '', { from: operator }))
    })

    it('update allowed after setUpdateOperator', async function() {
      const landId = await land.encodeTokenId(0, 1)
      await land.setUpdateOperator(landId, operator, sentByUser)
      await land.updateLandData(0, 1, 'newValue', { from: operator })
      const data = await land.landData(0, 1)
      data.should.be.equal('newValue')
    })

    it('update disallowed after setUpdateOperator to different address', async function() {
      const landId = await land.encodeTokenId(0, 1)
      await land.setUpdateOperator(landId, operator, sentByUser)
      await land.setUpdateOperator(landId, anotherUser, sentByUser)
      await assertRevert(
        land.updateLandData(0, 1, 'newValue', { from: operator })
      )
    })

    it('update disallowed after transfer', async function() {
      const landId = await land.encodeTokenId(0, 1)
      await land.setUpdateOperator(landId, operator, sentByUser)
      await land.safeTransferFrom(user, anotherUser, landId, sentByUser)
      await assertRevert(
        land.updateLandData(0, 1, 'newValue', { from: operator })
      )
    })

    it('update operator emits UpdateOperator event', async function() {
      const assetId = await land.encodeTokenId(0, 1)
      const { logs } = await land.setUpdateOperator(
        assetId,
        operator,
        sentByUser
      )

      // Event emitted
      logs.length.should.be.equal(1)

      const log = logs[0]
      log.event.should.be.eq('UpdateOperator')
      log.args.assetId.should.be.bignumber.equal(assetId)
      log.args.operator.should.be.equal(operator)
    })
  })
})
