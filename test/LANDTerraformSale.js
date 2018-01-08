'use strict'

const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const { EVMRevert, sum } = require('./utils')

const MANAToken = artifacts.require('./FAKEMana')
const LANDRegistry = artifacts.require('./LANDToken')
const LANDContinuousSale = artifacts.require('./LANDContinuousSale')
const LANDTerraformSale = artifacts.require('./LANDTerraformSale')

contract('LANDTerraformSale', function ([owner, terraformReserve, buyer1, buyer2, vested2]) {
  const metadata = ''

  let mana, sale, world

  beforeEach(async () => {
    mana = await MANAToken.new()
    sale = await LANDTerraformSale.new()
    world = await LANDRegistry.at(await sale.land())
  })

  describe('buyer want to buy LAND', function () {
    it('should assign non-adjacent LAND to buyer', async function () {
      await sale.buy(buyer1, 0, 0, { from: owner })
      await sale.buy(buyer1, 0, 5, { from: owner })

      // Check LAND created
      const numberOfLand = await world.totalSupply()
      numberOfLand.should.be.bignumber.equal(new BigNumber(2))

      // Check LAND assigned
      let newOwner = 0x0

      newOwner = await world.ownerOfLand(0, 0)
      newOwner.should.be.equal(buyer1)

      newOwner = await world.ownerOfLand(0, 5)
      newOwner.should.be.equal(buyer1)
    })

    it('should assign LAND to buyer in bulk', async function () {
      const x = [1, 1, 1, 1]
      const y = [0, 1, 2, 3]

      await sale.buyMany(buyer2, x, y)

      // Check LAND created
      const numberOfLand = await world.totalSupply()
      numberOfLand.should.be.bignumber.equal(new BigNumber(x.length))

      // Check LAND assigned
      let newOwner = 0x0
      for (let i = 0; i < x.length; i++) {
        newOwner = await world.ownerOfLand(x[i], y[i])
        newOwner.should.be.equal(buyer2)
      }
    })

    it('should recover empty metadata', async function () {
      const storedMetadata = await world.landMetadata(0, 0)
      storedMetadata.should.be.equal('')
    })
  })

  describe('transfer ownership of LANDToken contract', function () {
    it('should allow transfering ownership of LANDToken contract', async function () {    
      const landCost = 1000 * 1e18

      // terraform contract buy ok
      await sale.buy(buyer1, 0, 0, { from: owner })

      // continuous sale buy is not ok until transferred ownership
      const newSale = await LANDContinuousSale.new(mana.address, world.address)
      await mana.setBalance(buyer1, landCost)
      await mana.approve(newSale.address, landCost, { from: buyer1 })
      await newSale.buy(0, 1, metadata, { from: buyer1 }).should.be.rejectedWith(EVMRevert)

      // allow buy after transfering ownership
      await sale.transferLandOwnership(newSale.address)
      await newSale.buy(0, 1, metadata, { from: buyer1 }).should.not.be.rejectedWith(EVMRevert)
    })
  })
})
