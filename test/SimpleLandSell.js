const Mana = artifacts.require('./FAKEMana')
const Land = artifacts.require('./Land')
const SimpleLandSell = artifacts.require('./SimpleLandSell')
const BigNumber = web3.BigNumber

contract('Simple LAND Selling', function([owner, user]) {

  let mana, sell, world

  beforeEach(async () => {
    mana = await Mana.new()
    sell = await SimpleLandSell.new(mana.address)
    world = await Land.at(await sell.land())
    await mana.setBalance(user, 1e22);
  })

  it('allows a user to buy land', async function() {
    let numberOfLand = (await world.totalSupply()).toString()
    assert(numberOfLand == 1)

    await mana.approve(sell.address, 1e21, { from: user })
    await sell.buy(0, 1, 'Hello Decentraland!', { from: user })
    numberOfLand = (await world.totalSupply()).toString()
    assert(numberOfLand == 2)
  })
})

