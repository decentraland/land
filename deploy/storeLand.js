require('babel-register')
require('babel-polyfill')

const fs = require('fs')

const abi = require('ethereumjs-abi')
const abiDecoder = require('abi-decoder')

const LANDRegistry = artifacts.require('LANDRegistry')
let land
let globalLock = false

const filename = './deployment.example.json'
const gasPrice = 24e9
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function readJSON(filename) {
  return JSON.parse(fs.readFileSync(filename).toString())
}

function saveJSON(filename, data) {
  return fs.writeFileSync(filename, JSON.stringify(data, null, 2))
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function fund(input, target) {
  const contract = target.contract.address
  const balance = await MANA.balanceOf(contract)
  if (balance.equals(new web3.BigNumber(0))) {
    await MANA.transfer(contract, new web3.BigNumber(target.tokens).mul(1e18), {
      from: web3.eth.accounts[2],
      gas: 400000,
      gasPrice
    })
  } else {
    console.log(`Balance of ${contract}, ${balance.toString()} is not cero`)
  }
}

async function executeAndSave(func, input, target, field, filename) {
  try {
    const result = await func(input, target)
    if (result) {
      target[field] = result
      await saveJSON(filename, input)
    }
  } catch (e) {
    console.log(e, e.stack)
  }
}

async function updateStatus(input, workerIndex) {
  const parallelism = input.concurrency.accounts.length

  let index = parallelism
  const length = input.parcels.length
  for (let index = parallelism; index < length; index += parallelism) {
    const parcel = input.parcels[index]
    if (!parcel) continue
    if (parcel.pendingTransaction) {
      const receipt = await web3.eth.getTransactionReceipt(
        parcel.pendingTransaction
      )
      if (receipt && receipt.status) {
        parcel.successfulTransaction = receipt.transactionHash
        delete parcel.pendingTransaction
      } else if (receipt) {
        parcel.errorTransaction = receipt.transactionHash
        parcel.pickedUp = false
        delete parcel.pendingTransaction
      }
    }
  }
  await syncInput(input)
}

const NULL = '0x0000000000000000000000000000000000000000'

async function pickupParcels(input, workerIndex) {
  const parallelism = input.concurrency.accounts.length
  const length = input.parcels.length
  const parcels = []

  for (let index = workerIndex; index < length; index += parallelism) {
    const parcel = input.parcels[index]
    if (!parcel) continue

    if (!parcel.pickedUp) {
      if (
        parcels.length &&
        parcel.address !== parcels[parcels.length - 1].address
      ) {
        break
      }
      const owner = await land.ownerOfLand(parcel.x, parcel.y)
      if (owner !== NULL && owner !== parcel.address) {
        console.log(
          `Problem! owner of ${parcel.x}, ${parcel.y} is ${owner} and not ${
            parcel.address
          }`
        )
        continue
      }
      parcels.push(parcel)
    }
  }
  return parcels.slice(0, input.concurrency.parcelsPerTransaction)
}

function getXY(parcels) {
  const x = [],
    y = []
  for (let parcel of parcels) {
    x.push(parcel.x)
    y.push(parcel.y)
  }
  return { x, y }
}

async function sendTransactionAndWait(input, workerIndex, parcels) {
  const { x, y } = getXY(parcels)
  const account =
    web3.eth.accounts[input.concurrency.accounts[workerIndex].index]
  try {
    await web3.personal.unlockAccount(
      account,
      input.concurrency.accounts[workerIndex].password,
      10000
    )
    console.log('sending', x, y, parcels[0].address)
    const pendingTransaction = await land.assignMultipleParcels.sendTransaction(
      x,
      y,
      parcels[0].address,
      {
        gas: input.gasLimit,
        gasPrice: input.gasPrice,
        value: 0,
        from: account
      }
    )
    parcels.map(parcel => (parcel.pendingTransaction = pendingTransaction))
  } catch (e) {
    console.log(e.stack)
  } finally {
    await syncInput(input)
  }
}

async function syncInput(input) {
  while (globalLock) {
    await sleep(100)
  }
  globalLock = true
  await saveJSON(filename, input)
  globalLock = false
}

async function markPickupParcels(input, parcels) {
  for (let parcel of parcels) {
    parcel.pickedUp = true
  }
}

async function launchWorker(input, workerIndex) {
  const password = input.concurrency.accounts[workerIndex].password

  while (true) {
    const parcels = await pickupParcels(input, workerIndex)
    if (!parcels.length) {
      break
    }

    await markPickupParcels(input, parcels)
    await sendTransactionAndWait(input, workerIndex, parcels)
    await syncInput(input)
  }
}

async function optimizeOrder(input) {
  const length = input.parcels.length
  const workers = input.concurrency.accounts.length
  const map = {}
  const sorted = []
  const item = {}
  for (let parcel of input.parcels) {
    if (!parcel) continue
    map[parcel.address] = map[parcel.address] || []
    map[parcel.address].push(parcel)
  }
  const values = Object.values(map)
  let key = 0
  let worker = 0
  for (let i = 0; i < workers; i++) {
    item[i] = 0
  }
  for (const address of values) {
    for (const i in address) {
      let index = worker + item[worker] * workers
      while (index > length) {
        worker++
        worker %= workers
        index = worker + item[worker] * workers
      }
      sorted[worker + item[worker] * workers] = address[i]
      item[worker]++
    }
  }
  input.parcels = sorted
  await syncInput(input)
}

async function run() {
  const input = readJSON(filename)

  assert(input.landRegistry, 'Missing landRegistry address')
  assert(input.concurrency, 'Missing concurrency')
  assert(input.parcels, 'Missing parcels structure')

  land = await LANDRegistry.at(input.landRegistry)

  await optimizeOrder(input)

  for (let index = 0; index < input.concurrency.accounts.length; index++) {
    await updateStatus(input, index)
  }
  for (let index = 0; index < input.concurrency.accounts.length; index++) {
    try {
      launchWorker(input, index)
    } catch (error) {
      console.log(error.stack)
      process.exit(0)
    }
  }
}

const ret = function(callback) {
  run()
    .then(() => callback())
    .catch(console.log)
    .catch(callback)
}
Object.assign(ret, {
  readJSON,
  saveJSON,
  run
})
module.exports = ret
