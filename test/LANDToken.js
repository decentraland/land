'use strict'

const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Land = artifacts.require('./LANDToken')

contract('LANDToken', function ([owner, user1, user2]) {
  let world

  beforeEach(async () => {
    world = await Land.new()

    const tokenId = await world.buildTokenId(0, 0)
    await world.assignNewParcel(user1, tokenId, 'Genesis')
  })

  it('should report that the user has the correct amount of LAND', async function () {
    const numberOfLand = await world.totalSupply()
    numberOfLand.should.be.bignumber.equal(1)
  })

  it('should handle the transfer of LAND', async function () {
    const tokenId = await world.buildTokenId(0, 0)
    await world.transfer(user2, tokenId, { from: user1 })

    const balanceUser1 = await world.balanceOf(user1)
    balanceUser1.should.be.bignumber.equal(0)

    const balanceUser2 = await world.balanceOf(user2)
    balanceUser2.should.be.bignumber.equal(1)
  })

  it('should allow updating multiple LAND updates', async function () {
    const land1 = await world.buildTokenId(1, 3)
    const land2 = await world.buildTokenId(-1, 2)
    await world.assignNewParcel(user1, land1, 'Empty')
    await world.assignNewParcel(user1, land2, 'Empty')

    await world.updateManyLandMetadata([1, -1], [3, 2], 'Changed', { from: user1 })

    const resultLand1 = await world.landMetadata(1, 3)
    resultLand1.should.equal('Changed')
    const resultLand2 = await world.landMetadata(-1, 2)
    resultLand2.should.equal('Changed')
  })
})
