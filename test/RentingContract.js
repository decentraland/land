const Mana = artifacts.require('./FAKEMana')
const Land = artifacts.require('./LANDToken')
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
    sell = await LANDContinuousSale.new(mana.address)
    world = await Land.at(await sell.land())
    await mana.setBalance(user, 1e22)
    await mana.approve(sell.address, 1e21, { from: user })
    await sell.buy(0, 1, 'Hello Decentraland!', { from: user })
    rent = await Rent.new(world.address)
  })

  it('allows a user to rent land', async function () {
    await rent.initRentContract(x, y, upfront, ownerCost, weekly)
  })
})
