const FakeLAND = artifacts.require('./FakeLAND')
const BigNumber = web3.BigNumber

contract('LAND', function(accounts) {
  let world
  let land
  let user = accounts[0]
  let user2 = accounts[1]
  let query

  beforeEach(async () => {
    world = await FakeLAND.new()
    land = 1
    await world.create(1, user, new Buffer(0))
  })

  it('reports that the user has the correct amount of land', async function() {
    const numberOfLand = (await world.totalSupply.call()).toString()
    assert(numberOfLand == 1)
  })

  it('handles correctly the transfer of a token', async function() {
    await world.transfer(land, user2, { from: user })
    let user1land = (await world.balanceOf(user).call()).toString()
    let user2land = (await world.balanceOf(user2).call()).toString()

    assert (user1land == 0)
    assert (user2land == 1)
  })
});
