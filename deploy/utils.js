const https = require('https')
const fs = require('fs')

const log = {
  info(...args) {
    console.log('[INFO]', ...args)
  },
  warn(...args) {
    console.log('[WARN]', ...args)
  },
  debug() {},
  error(...args) {
    console.error('[ERROR]', ...args)
  }
}

function setLogLevel(logLevel = 'info') {
  if (logLevel.toLowerCase() === 'debug') {
    log.debug = (...args) => {
      console.log('[DEBUG]', ...args)
    }
  }
}

function expandPath(path) {
  return ['.', '/'].includes(path[0]) ? path : `${__dirname}/${path}`
}

function parseArgs(args) {
  const parsedArgs = {}
  let lastArgName = ''

  for (const arg of args) {
    if (arg.startsWith('--')) {
      lastArgName = arg.slice(2)
    } else {
      parsedArgs[lastArgName] = arg
    }
  }

  return parsedArgs
}

function getConfiguration(filepath = `${__dirname}/configuration.json`) {
  log.debug(`Gettting configuration file "${filepath}"`)
  return readJSON(filepath)
}

function readJSON(filepath) {
  let json
  try {
    log.debug(`Reading JSON file "${filepath}"`)
    const fileContent = fs.readFileSync(filepath).toString()
    json = JSON.parse(fileContent)
  } catch (error) {
    log.error(`Error trying to read file "${filepath}"`)
    throw error
  }
  return json
}

function requestJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, resp => {
        let data = ''
        resp.on('data', chunk => (data += chunk))
        resp.on('end', () => resolve(JSON.parse(data)))
      })
      .on('error', err => reject('Error: ' + err.message))
  })
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function getFailedTransactions(allPendingTransactions, web3) {
  const pendingTransactions = { ...allPendingTransactions }
  const failedTransactions = {}

  while (Object.keys(pendingTransactions).length > 0) {
    for (const hash in pendingTransactions) {
      const tx = await web3.eth.getTransaction(hash)
      log.debug(`Getting status of tx ${hash}, got`, tx)

      if (!tx.blockNumber) continue
      await sleep(1000)

      const receipt = await web3.eth.getTransactionReceipt(hash)
      log.debug(`Getting receipt of tx ${hash}, got`, receipt)

      if (receipt == null || receipt.status === '0x0') {
        failedTransactions[hash] = pendingTransactions[hash]
      }
      delete pendingTransactions[hash]
    }

    await sleep(5000)
  }

  return failedTransactions
}

function isEmptyAddress(address) {
  const NULL = '0x0000000000000000000000000000000000000000'
  const NULL_PARITY = '0x'
  return address === NULL || address === NULL_PARITY
}

module.exports = {
  log,
  setLogLevel,
  expandPath,
  parseArgs,
  getConfiguration,
  readJSON,
  requestJSON,
  sleep,
  getFailedTransactions,
  isEmptyAddress
}
