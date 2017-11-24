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

contract('LANDContinuousSale', function ([owner, buyer1, buyer2]) {
  const landCost = 1000 * 1e18
  const initialBalance = 1000 * 1e18
  const metadata = 'Hello Decentraland!'

  let mana, sale, world

  beforeEach(async () => {
    // MANA
    mana = await Mana.new()
    await mana.setBalance(buyer1, initialBalance)

    // LAND
    world = await Land.new()
    const tokenId = await world.buildTokenId(0, 0)
    await world.assignNewParcel(owner, tokenId, 'Genesis')

    // SALE
    sale = await LANDContinuousSale.new(mana.address, world.address)
    await world.transferOwnership(sale.address)
  })

  it('should allows a user to buy land', async function () {
    await mana.approve(sale.address, landCost, { from: buyer1 })
    await sale.buy(0, 1, metadata, { from: buyer1 })

    const numberOfLand = await world.totalSupply()
    numberOfLand.should.be.bignumber.equal(new BigNumber(2))

    const storedMetadata = await world.landMetadata(0, 1)
    storedMetadata.should.be.equal(metadata)
  })

  it('should throw if non-adjacent buy', async function () {
    await mana.approve(sale.address, landCost, { from: buyer1 })
    await sale.buy(0, 10, metadata, { from: buyer1 }).should.be.rejectedWith(EVMRevert)
  })

  it('should throw if LAND already bought', async function () {
    await mana.approve(sale.address, landCost, { from: buyer1 })
    await sale.buy(0, 1, metadata, { from: buyer1 })
    await sale.buy(0, 1, metadata, { from: buyer1 }).should.be.rejectedWith(EVMRevert)
  })

  it('should throw if not enough MANA to buy LAND', async function () {
    await sale.buy(0, 1, metadata, { from: buyer2 }).should.be.rejectedWith(EVMRevert)
  })

  it('should allow transfering ownership of LANDToken contract', async function () {
    const newSale = await LANDContinuousSale.new(mana.address, world.address)
    await mana.approve(newSale.address, landCost, { from: buyer1 })
    await newSale.buy(0, 1, metadata, { from: buyer1 }).should.be.rejectedWith(EVMRevert)

    await sale.transferLandOwnership(newSale.address)
    await newSale.buy(0, 1, metadata, { from: buyer1 }).should.not.be.rejectedWith(EVMRevert)
  })
})
