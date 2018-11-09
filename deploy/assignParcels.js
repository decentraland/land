const {
  log,
  setLogLevel,
  expandPath,
  parseArgs,
  getConfiguration,
  readJSON,
  isEmptyObject,
  waitForFailedTransactions,
  isEmptyAddress
} = require('./utils')

const LANDRegistryArtifact = artifacts.require('LANDRegistry')
const LANDRegistryDecorator = require('./LANDRegistryDecorator')

const BATCH_SIZE = 50
const IGNORE_FAILED_TXS = true
const REQUIRED_ARGS = ['parcels', 'account', 'password', 'owner']

function checkRequiredArgs(args) {
  const hasRequiredArgs = REQUIRED_ARGS.every(argName => args[argName] != null)

  if (!hasRequiredArgs) {
    const argNames = Object.keys(args)
    throw new Error(
      `Missing required arguments. Supplied ${argNames}, required ${REQUIRED_ARGS}`
    )
  }
}

function checkWeb3Account(account) {
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
}

async function assignParcels(parcels, landRegistry, newOwner, options) {
  const {
    batchSize = BATCH_SIZE,
    ignoreFailedTxs = IGNORE_FAILED_TXS
  } = options
  const pendingTransactions = {}
  let parcelsToAssign = []

  log.debug(`Setting the owner of ${parcels.length} parcels as ${newOwner}`)

  for (const parcel of parcels) {
    if (typeof parcel.x === 'undefined' || typeof parcel.y === 'undefined') {
      throw new Error(
        `Malformed parcel found on parcel json file: ${JSON.stringify(parcel)}`
      )
    }

    log.debug(`Getting on chain owner for parcel ${parcel.x},${parcel.y}`)
    const owner = await landRegistry.getCurrentOwner(parcel)

    if (isEmptyAddress(owner)) {
      log.debug(`Empty owner for ${parcel.x},${parcel.y}, will be assigned`)
    } else {
      log.warn(`${parcel.x},${parcel.y} already has ${owner} as owner!`)
      continue
    }

    parcelsToAssign.push(parcel)

    if (parcelsToAssign.length >= batchSize) {
      const hash = await landRegistry.assignMultipleParcels(
        parcelsToAssign,
        newOwner
      )
      log.info(
        `Setting ${newOwner} as owner for ${parcelsToAssign.length}: ${hash}`
      )
      pendingTransactions[hash] = parcelsToAssign
      parcelsToAssign = []
    }
  }

  if (parcelsToAssign.length > 0) {
    const hash = await landRegistry.assignMultipleParcels(
      parcelsToAssign,
      newOwner
    )
    pendingTransactions[hash] = parcelsToAssign
  }

  if (isEmptyObject(pendingTransactions)) {
    log.info('Nothing else to do')
    return
  } else {
    log.info('Waiting for transactions to end')
  }

  const failedTransactions = await waitForFailedTransactions(
    pendingTransactions,
    web3
  )
  const failedTransactionsCount = Object.keys(failedTransactions).length

  if (failedTransactionsCount > 0 && ignoreFailedTxs !== false) {
    log.info(
      `Found ${failedTransactionsCount} failed transactions, retrying those`
    )
    const failedParcels = Object.values(failedTransactions).reduce(
      (allParcels, parcels) => allParcels.concat(parcels),
      []
    )
    return await assignParcels(parcels, landRegistry, newOwner, options)
  }

  log.info('All done!')
}

async function run(args) {
  checkRequiredArgs(args)
  checkWeb3Account(args.account)

  setLogLevel(args.logLevel)
  log.debug('Using args', JSON.stringify(args, null, 2))

  const configuration = getConfiguration()
  const parcelsToDeploy = readJSON(expandPath(args.parcels))

  const { account, password, owner, batchSize, ignoreFailedTxs } = args
  const { txConfig, contractAddresses } = configuration

  log.debug(`Unlocking account ${account}`)
  await this.web3.personal.unlockAccount(account, password, 10000)

  const landRegistryContract = await LANDRegistryArtifact.at(
    contractAddresses.LANDRegistry
  )
  const landRegistry = new LANDRegistryDecorator(
    landRegistryContract,
    account,
    txConfig
  )

  await assignParcels(parcelsToDeploy, landRegistry, owner, {
    batchSize,
    ignoreFailedTxs
  })
}

async function main(argv) {
  try {
    if (argv.length < REQUIRED_ARGS.length || argv[0] === 'help') {
      console.log(`Deploy (set an owner for) a list of unowned parcels. To run, use:

truffle exec assignParcels.js --parcels genesis.json --account 0x --password 123 --batch 50 --owner 0x --logLevel debug --network (...)

--parcels genesis.json - List of parcels to deploy. Required
--account 0xdeadbeef     - Which account to use to deploy. Required
--password S0m3P4ss      - Password for the account. Required
--owner 0xdeadbeef       - The new owner to be used. Required
--batchSize 50           - Parcels per transaction. Default ${BATCH_SIZE}
--ignoreFailedTxs        - If this flag is present, the script will *not* try to re-send failed transactions
--logLevel debug         - Log level to use. Possible values: info, debug. Default: info

`)
    } else {
      await run(parseArgs(argv))
    }
  } catch (error) {
    log.error(error)
    throw new Error(error)
  }
}

if (require.main === module) {
  main(process.argv.slice(2))
}

module.exports = async function(callback) {
  try {
    await main(process.argv.slice(4))
  } finally {
    callback()
  }
}
