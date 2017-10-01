const Land = artifacts.require('./Land')
const BigNumber = web3.BigNumber

contract('LAND', function(accounts) {
  let world
  let land
  let controller = accounts[0]
  let user = accounts[1]
  let user2 = accounts[2]
  let query

  beforeEach(async () => {
    world = await Land.new(controller)
    land = 1
    await world.assignNewParcel(user, new BigNumber(1), 'Hello world')
  })

  it('reports that the user has the correct amount of land', async function() {
    const numberOfLand = (await world.totalSupply.call()).toString()
    assert(numberOfLand == 1)
  })

  it('handles correctly the transfer of a token', async function() {
    await world.transfer(user2, land, { from: user })
    let user1land = (await world.balanceOf(user)).toString()
    let user2land = (await world.balanceOf(user2)).toString()

    assert(user1land == 0)
    assert(user2land == 1)
  })
});
