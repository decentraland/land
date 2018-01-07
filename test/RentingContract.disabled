const Mana = artifacts.require('./FAKEMana')
const Land = artifacts.require('./LANDToken')
const LANDContinuousSale = artifacts.require('./LANDContinuousSale')
const Rent = artifacts.require('./RentingContract')
const BigNumber = web3.BigNumber

contract('Renting', function ([owner, user, tenant]) {
  let mana, sell, world, rent

  const x = 0
  const y = 1
  const upfront = 100
  const ownerCost = 100
  const weekly = 10

  beforeEach(async () => {
    mana = await Mana.new()

    // LAND
    world = await Land.new()
    const tokenId = await world.buildTokenId(0, 0)
    await world.assignNewParcel(owner, tokenId, 'Genesis')

    // SALE
    sell = await LANDContinuousSale.new(mana.address, world.address)
    await world.transferOwnership(sell.address)

    await mana.setBalance(user, 1e22)
    await mana.approve(sell.address, 1e21, { from: user })
    await sell.buy(x, y, 'Hello Decentraland!', { from: user })
  })

  it('allows a user to rent land', async function () {
    rent = await Rent.new(world.address, upfront, ownerCost, weekly, { from: user })
    // await world.transferLand(rent.address, x, y, { from: user })
    // await rent.initRentContract(x, y, , { from: user })
  })
})
