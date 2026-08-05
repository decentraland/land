// Returns the time of the last mined block in seconds
export async function latestTime() {
  const block = await web3.eth.getBlock('latest')
  return Number(block.timestamp)
}

// Sends a single JSON-RPC call through the (Hardhat Network) provider.
// web3 1.x renamed the provider's `sendAsync` to `send`.
function rpcSend(method, params = []) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      { jsonrpc: '2.0', method, params, id: Date.now() },
      (err, res) => (err ? reject(err) : resolve(res))
    )
  })
}

// Increases EVM time by the passed duration in seconds, then mines a block.
export async function increaseTime(duration) {
  await rpcSend('evm_increaseTime', [duration])
  return rpcSend('evm_mine', [])
}

/**
 * Beware that due to the need of calling two separate testrpc methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
export async function increaseTimeTo(target) {
  let now = await latestTime()
  if (target < now)
    throw Error(
      `Cannot increase current time(${now}) to a moment in the past(${target})`
    )
  let diff = target - now
  return increaseTime(diff)
}

export const duration = {
  seconds: function(val) {
    return val
  },
  minutes: function(val) {
    return val * this.seconds(60)
  },
  hours: function(val) {
    return val * this.minutes(60)
  },
  days: function(val) {
    return val * this.hours(24)
  },
  weeks: function(val) {
    return val * this.days(7)
  },
  years: function(val) {
    return val * this.days(365)
  }
}
