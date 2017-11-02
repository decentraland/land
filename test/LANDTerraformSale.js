'use strict'

const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const { EVMThrow, sum } = require('./utils')

const Mana = artifacts.require('./FAKEMana')
const Land = artifacts.require('./LANDToken')
const LANDTerraformSale = artifacts.require('./LANDTerraformSale')

contract('LANDTerraformSale', function ([owner, terraformReserve, buyer1, buyer2]) {
  const landCost = 1000 * 1e18
  const totalMANALocked = 10000 * 1e18
  const returnRegistry = 0x0

  let mana, sale, world

  beforeEach(async () => {
    mana = await Mana.new()
    sale = await LANDTerraformSale.new(mana.address, terraformReserve, returnRegistry)
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
      const newBalance = await mana.balanceOf(terraformReserve)
      newBalance.should.be.bignumber.equal(oldBalance - totalCost)
    })

    it('should recover empty metadata', async function () {
      const storedMetadata = await world.landMetadata(0, 0)
      storedMetadata.should.be.equal('')
    })
  })
})
