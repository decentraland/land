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

function checkRequiredArgs(args, requiredArgs) {
  const hasRequiredArgs = requiredArgs.every(argName => args[argName] != null)

  if (!hasRequiredArgs) {
    const argNames = Object.keys(args)
    throw new Error(
      `Missing required arguments. Supplied ${argNames}, required ${requiredArgs}`
    )
  }
}

function expandPath(path) {
  if (!path) throw new Error(`Invalid path ${path}`)
  return ['.', '/'].includes(path[0]) ? path : `${__dirname}/${path}`
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

function sleep(ms) {
  log.info(`Sleeping for ${ms / 1000} seconds`)
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function unlockWeb3Account(web3, account, password) {
  if (web3 === 'undefined') {
    throw new Error('web3 object is not defined')
  }
  if (!web3.eth.accounts || web3.eth.accounts.length === 0) {
    throw new Error('Empty web3 accounts')
  }
  if (!web3.eth.accounts.find(ethAccount => ethAccount === account)) {
    throw new Error(
      `Couldn't find account ${account} in:\n${web3.eth.accounts.join('\n')}`
    )
  }

  if (password) {
    log.debug(`Unlocking account ${account}`)
    await web3.personal.unlockAccount(account, password)
  }
}

async function getFailedTransactions(transactions, web3) {
  const completedTransactions = await waitForTransactions(transactions, web3)
  return completedTransactions.filter(tx => tx.status === 'failed')
}

async function waitForTransaction(transaction, web3) {
  const completedTransactions = await waitForTransactions([transaction], web3)
  return completedTransactions[0]
}

async function waitForTransactions(allPendingTransactions, web3) {
  log.info(`Waiting for ${allPendingTransactions.length} transactions`)

  const completedTransactions = []
  let pendingTransactions = [...allPendingTransactions]

  while (pendingTransactions.length > 0) {
    for (const transaction of pendingTransactions) {
      const hash = transaction.hash
      const tx = await web3.eth.getTransaction(hash)
      log.debug(
        `Getting status of tx ${hash}, got:\n`,
        JSON.stringify({ ...tx, raw: '(...)', input: '(...)' }, null, 2)
      )

      if (!tx) {
        log.debug('tx not found, still pending')
        continue
      }

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

      const completedTransaction = { ...transaction }

      if (receipt == null || receipt.status === '0x0') {
        log.info(`Receipt undefined for tx ${hash}, marked as failed`)
        completedTransaction.status = 'failed'
      } else {
        log.info(`Tx ${hash} confirmed!`)
        completedTransaction.status = 'confirmed'
      }
      completedTransactions.push(completedTransaction)
      pendingTransactions = pendingTransactions.filter(ptx => ptx.hash !== hash)
    }

    await sleep(6000)
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

  checkRequiredArgs,
  parseArgs,
  getConfiguration,

  expandPath,
  readJSON,

  sleep,

  unlockWeb3Account,
  getFailedTransactions,
  waitForTransaction,
  waitForTransactions,
  isEmptyAddress
}
