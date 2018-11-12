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

function sleep(ms) {
  log.debug(`Sleeping for ${ms / 1000} seconds`)
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0
}

async function waitForTransaction(transaction, web3) {
  const completedTransactions = await waitForTransactions([transaction], web3)
  return completedTransactions[0]
}

async function waitForTransactions(allPendingTransactions, web3) {
  const completedTransactions = []
  let pendingTransactions = [...allPendingTransactions]

  while (pendingTransactions.length > 0) {
    for (const transaction of pendingTransactions) {
      const hash = transaction.hash
      const tx = await web3.eth.getTransaction(hash)
      log.debug(
        `Getting status of tx ${hash}, got:\n`,
        JSON.stringify({ ...tx, input: '(...)' }, null, 2)
      )

      if (!tx.blockNumber) {
        log.debug('Block number undefined, still pending')
        continue
      }
      await sleep(2000)

      const receipt = await web3.eth.getTransactionReceipt(hash)
      log.debug(
        `Getting receipt of tx ${hash}, got:\n`,
        JSON.stringify({ ...receipt, logsBloom: '(...)' }, null, 2)
      )

      const completedTransaction = { transaction }

      if (receipt == null || receipt.status === '0x0') {
        log.debug(`Receipt undefined for tx ${hash}, marked as failed`)
        completedTransaction.status = 'failed'
      } else {
        log.debug(`Tx ${hash} confirmed!`)
        completedTransaction.status = 'confirmed'
      }
      completedTransactions.push(transaction)
      pendingTransactions = pendingTransactions.filter(ptx => ptx.hash !== hash)
    }

    await sleep(5000)
  }

  return completedTransactions
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
  isEmptyObject,
  waitForTransaction,
  waitForTransactions,
  isEmptyAddress
}
