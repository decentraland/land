'use strict'

const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Mana = artifacts.require('./FAKEMana')
const Land = artifacts.require('./LANDToken')
const LANDTerraformSale = artifacts.require('./LANDTerraformSale')

contract('LANDTerraformSale', function ([owner, buyer1, buyer2]) {
  let mana, sell, world

  before(async () => {
    mana = await Mana.new()
    sell = await LANDTerraformSale.new(mana.address)
    world = await Land.at(await sell.land())
    await mana.setBalance(buyer1, 1e22)
  })

  it('should have a genesis LAND', async function () {
    const numberOfLand = await world.totalSupply()
    numberOfLand.should.be.bignumber.equal(new BigNumber(1))
  })

  describe('buyer want to buy LAND', function () {
    const metadata = 'Hello Decentraland!'
    const landCost = 1e21

    it('should allow assign LAND to buyer', async function () {
      await mana.approve(sell.address, landCost, { from: buyer1 })
      await sell.buy(0, 1, metadata, landCost, { from: buyer1 })

      const numberOfLand = await world.totalSupply()
      numberOfLand.should.be.bignumber.equal(new BigNumber(2))
    })

    it('should allow assign non-adjacent LAND to buyer', async function () {
      await mana.approve(sell.address, landCost, { from: buyer1 })
      await sell.buy(0, 10, metadata, landCost, { from: buyer1 })

      const numberOfLand = await world.totalSupply()
      numberOfLand.should.be.bignumber.equal(new BigNumber(3))
    })

    it('should recover right metadata', async function () {
      const storedMetadata = await world.landMetadata(0, 1)
      storedMetadata.should.be.equal(metadata)
    })
  })
})
