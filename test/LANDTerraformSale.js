'use strict'

const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const utils = require('./utils')

const Mana = artifacts.require('./FAKEMana')
const Land = artifacts.require('./LANDToken')
const LANDTerraformSale = artifacts.require('./LANDTerraformSale')

contract('LANDTerraformSale', function ([owner, terraformReserve, buyer1, buyer2]) {
  const totalMANALocked = 1e22
  const returnRegistry = 0x0

  let mana, sale, world

  before(async () => {
    mana = await Mana.new()
    sale = await LANDTerraformSale.new(mana.address, terraformReserve, returnRegistry)
    world = await Land.at(await sale.land())

    await mana.setBalance(terraformReserve, totalMANALocked)
    await mana.approve(sale.address, totalMANALocked, {from: terraformReserve})
  })

  describe('buyer want to buy LAND', function () {
    const landCost = 1e21

    it('should assign LAND to buyer', async function () {
      await sale.buy(buyer1, 0, 0, landCost, { from: owner })

      const numberOfLand = await world.totalSupply()
      numberOfLand.should.be.bignumber.equal(new BigNumber(1))
    })

    it('should assign non-adjacent LAND to buyer', async function () {
      await sale.buy(buyer1, 0, 10, landCost, { from: owner })

      const numberOfLand = await world.totalSupply()
      numberOfLand.should.be.bignumber.equal(new BigNumber(2))
    })

    it('should assign LAND to buyer in bulk', async function () {
      const x = [1, 1, 1, 1]
      const y = [0, 1, 2, 3]
      const cost = Array(x.length).fill(landCost)
      const totalCost = utils.sum(cost)

      const oldBalance = await mana.allowance(terraformReserve, sale.address)

      await sale.buyMany(buyer2, x, y, totalCost)

      // Check LAND assigned
      const numberOfLand = await world.totalSupply()
      numberOfLand.should.be.bignumber.equal(new BigNumber(2 + x.length))

      // Check MANA burnt
      const newBalance = await mana.allowance(terraformReserve, sale.address)
      newBalance.should.be.bignumber.equal(oldBalance - totalCost)
    })

    it('should recover empty metadata', async function () {
      const storedMetadata = await world.landMetadata(0, 0)
      storedMetadata.should.be.equal('')
    })
  })
})
