'use strict'

const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const { EVMRevert, sum } = require('./utils')

const Mana = artifacts.require('./FAKEMana')
const Land = artifacts.require('./LANDToken')
const LANDContinuousSale = artifacts.require('./LANDContinuousSale')
const LANDTerraformSale = artifacts.require('./LANDTerraformSale')
const ReturnVestingRegistry = artifacts.require('./ReturnVestingRegistry')

contract('LANDTerraformSale', function ([owner, terraformReserve, buyer1, buyer2, vested2]) {
  const landCost = 1000 * 1e18
  const totalMANALocked = 10000 * 1e18

  let mana, sale, world, returnVesting

  beforeEach(async () => {
    mana = await Mana.new()
    returnVesting = await ReturnVestingRegistry.new()
    await returnVesting.record(buyer2, vested2)

    sale = await LANDTerraformSale.new(mana.address, terraformReserve, returnVesting.address)
    world = await Land.at(await sale.land())

    await mana.setBalance(terraformReserve, totalMANALocked)
    await mana.approve(sale.address, totalMANALocked, {from: terraformReserve})
  })

  describe('buyer want to buy LAND', function () {
    it('should assign non-adjacent LAND to buyer', async function () {
      await sale.buy(buyer1, 0, 0, landCost, { from: owner })
      await sale.buy(buyer1, 0, 10, landCost, { from: owner })

      // Check LAND created
      const numberOfLand = await world.totalSupply()
      numberOfLand.should.be.bignumber.equal(new BigNumber(2))

      // Check LAND assigned
      let newOwner = 0x0

      newOwner = await world.ownerOfLand(0, 0)
      newOwner.should.be.equal(buyer1)

      newOwner = await world.ownerOfLand(0, 10)
      newOwner.should.be.equal(buyer1)
    })

    it('should assign LAND to buyer in bulk', async function () {
      const x = [1, 1, 1, 1]
      const y = [0, 1, 2, 3]
      const cost = Array(x.length).fill(landCost)
      const totalCost = sum(cost)

      const oldBalance = await mana.balanceOf(terraformReserve)
      await sale.buyMany(buyer2, x, y, totalCost)
      const newBalance = await mana.balanceOf(terraformReserve)

      // Check LAND created
      const numberOfLand = await world.totalSupply()
      numberOfLand.should.be.bignumber.equal(new BigNumber(x.length))

      // Check LAND assigned
      let newOwner = 0x0
      for (let i = 0; i < x.length; i++) {
        newOwner = await world.ownerOfLand(x[i], y[i])
        newOwner.should.be.equal(buyer2)
      }

      // Check MANA burnt
      newBalance.should.be.bignumber.equal(oldBalance - totalCost)
    })

    it('should recover empty metadata', async function () {
      const storedMetadata = await world.landMetadata(0, 0)
      storedMetadata.should.be.equal('')
    })
  })

  describe('return MANA back to buyers', function () {
    it('should throw if not the owner returning funds', async function () {
      await sale.transferBackMANA(buyer1, landCost, {from: buyer2}).should.be.rejectedWith(EVMRevert)
    })

    it('should throw if amount to return is not positive', async function () {
      await sale.transferBackMANA(buyer1, 0).should.be.rejectedWith(EVMRevert)
      await sale.transferBackMANA(buyer1, -1).should.be.rejectedWith(EVMRevert)
    })

    it('should throw if return address is invalid', async function () {
      await sale.transferBackMANA(0x0, landCost).should.be.rejectedWith(EVMRevert)
    })

    it('should return funds to buyer', async function () {
      const oldBalance = await mana.balanceOf(buyer1)
      await sale.transferBackMANA(buyer1, landCost)
      const newBalance = await mana.balanceOf(buyer1)
      newBalance.should.be.bignumber.equal(oldBalance + landCost)
    })

    it('should return funds to vested buyer', async function () {
      const oldBalance = await mana.balanceOf(vested2)
      await sale.transferBackMANA(buyer2, landCost)
      const newBalance = await mana.balanceOf(vested2)
      newBalance.should.be.bignumber.equal(oldBalance + landCost)
    })
  })

  describe('transfer ownership of LANDToken contract', function () {
    it('should allow transfering ownership of LANDToken contract', async function () {
      const metadata = ''
    
      await sale.buy(buyer1, 0, 0, landCost, { from: owner })

      await mana.setBalance(buyer1, landCost)
      const newSale = await LANDContinuousSale.new(mana.address, world.address)
      await mana.approve(newSale.address, landCost, { from: buyer1 })
      await newSale.buy(0, 1, metadata, { from: buyer1 }).should.be.rejectedWith(EVMRevert)

      await sale.transferLandOwnership(newSale.address)
      await newSale.buy(0, 1, metadata, { from: buyer1 }).should.not.be.rejectedWith(EVMRevert)
    })
  })
})
