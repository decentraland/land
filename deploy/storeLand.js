require('babel-register')
require('babel-polyfill')

const fs = require('fs')

const abi = require('ethereumjs-abi')
const abiDecoder = require('abi-decoder')

const LANDRegistry = artifacts.require('LANDRegistry')
let land

const filename = './deployment.json'
const gasPrice = 24e9
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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
    await MANA.transfer(contract, new web3.BigNumber(target.tokens).mul(1e18), { from: web3.eth.accounts[2], gas: 400000, gasPrice })
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
  const parallelism = input.concurrency.accountPasswords.length

  let index = parallelism
  const length = input.coordinates.length
  for (let index = parallelism; index < length; index++) {
    if (parcel.pendingTransaction) {
      const receipt = await web3.eth.getTransactionReceipt(parcel.pendingTransaction)
      if (receipt && receipt.status) {
        parcel.successfulTransaction = receipt.transactionHash
        parcel.pickedUp = false
        delete parcel.pendingTransaction
      } else {
        parcel.errorTransaction = receipt.transactionHash
        parcel.pickedUp = false
        delete parcel.pendingTransaction
      }
    }
  }
}

async function pickupParcels(input, workerIndex, offset = 0) {
  const parallelism = input.concurrency.accountPasswords.length
  let index = parallelism * (offset + 1)
  const length = input.coordinates.length
  const parcels = []

  for (let index = parallelism; index < length; index++) {
    const parcel = coords[index]
    index += parallelism

    if (!parcel.pickedUp) {
      if (parcels.length && parcel.address !== parcels[parcels.length - 1].address) {
        break
      }
      parcels.push(parcel)
    }
  }
  return parcels
}

function getXY(parcels) {
  const x = [], y = []
  for (let parcel of parcels) {
    x.push(parcel.x)
    y.push(parcel.y)
  }
  return { x, y }
}

async function sendTransactionAndWait(input, parcels) {
  return new Promise((resolve, reject) => {
    const { x, y } = getXY(parcels)
    const pendingTransaction = land.assignMultipleParcels(x, y, parcels[0].address, function(err, result) {
      if (err) {
        return reject(err)
      }
      return resolve(result)
    })
    parcels.map(parcel => parcel.pendingTransaction = pendingTransaction)
  })
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
  await syncInput(input)
}

async function launchWorker(input, workerIndex) {
  const password = input.concurrency.accountPasswords[workerIndex]

  while (true) {
    const parcels = await pickupParcels(input, workerIndex)
    if (!parcels.length) {
      break
    }

    await markPickupParcels(input, parcels)
    await sendTransactionAndWait(input, parcels)

    await syncInput(input)
  }
}

async function optimizeOrder(input) {
  const length = input.coordinates.length
  const workers = input.concurrency.accountPasswords.length
  const map = {}
  const sorted = []
  const item = {}
  for (let parcel of input.coordinates) {
    map[parcel.address] = map[parcel.address] || []
    map[parcel.address].push(parcel)
  }
  const values = Object.values(map)
  let key = 0
  let worker = 0
  for (let i = 0; i < workers; i++) {
    workers[i] = 0
  }
  for (const address of values) {
    for (const item in address) {
      sorted[(worker + item[worker] * workers) % length] = address[item]
      item[worker]++;
    }
    worker++;
    worker %= workers;
  }
  input.coordinates = sorted
  await syncInput(input)
}

async function run() {
  const input = readJSON(filename)

  assert(input.landRegistry, 'Missing landRegistry address')
  assert(input.concurrency, 'Missing concurrency')
  assert(input.parcels, 'Missing parcels structure')

  land = await LANDRegistry.at(input.landRegistry)

  await optimizeOrder(input)

  // for (let index = 0; index < input.concurrency.accountPasswords.length; i++) {
  //   await updateStatus(input, index)
  //   try {
  //     launchWorker(input, index)
  //   } catch (error) {
  //     console.log(error.stack)
  //     process.exit(0)
  //   }
  // }
}

const ret = function(callback) {
  run().then(() => callback()).catch(console.log).catch(callback)
}
Object.assign(ret, {
  readJSON, saveJSON, run, deploy, executeAndSave, fund
})
module.exports = ret
