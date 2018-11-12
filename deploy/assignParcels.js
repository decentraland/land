const ScriptRunner = require('./ScriptRunner')
const { log, waitForTransactions, isEmptyAddress } = require('./utils')

const LANDRegistryArtifact = artifacts.require('LANDRegistry')
const { LANDRegistryDecorator } = require('./ContractDecorators')
let landRegistry

const LANDS_PER_ASSIGN = 50
const BATCH_SIZE = 1
const IGNORE_FAILED_TXS = true
const REQUIRED_ARGS = ['parcels', 'account', 'owner']

async function assignParcels(parcels, newOwner, options) {
  /* TX = { hash, data, status } */
  const {
    batchSize = BATCH_SIZE,
    landsPerAssign = LANDS_PER_ASSIGN,
    ignoreFailedTxs = IGNORE_FAILED_TXS
  } = options
  let runningTransactions = []
  let failedTransactions = []
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

    if (parcelsToAssign.length >= landsPerAssign) {
      const transaction = await assignMultipleParcels(parcelsToAssign, newOwner)
      runningTransactions.push(transaction)
      parcelsToAssign = []
    }

    if (runningTransactions.length >= batchSize) {
      failedTransactions = failedTransactions.concat(
        await getFailedTransactions(runningTransactions)
      )
      runningTransactions = []
    }
  }

  if (parcelsToAssign.length > 0) {
    const transaction = await assignMultipleParcels(parcelsToAssign, newOwner)
    runningTransactions.push(transaction)
    failedTransactions = failedTransactions.concat(
      await getFailedTransactions(runningTransactions)
    )
  }

  if (failedTransactions.length === 0) {
    log.info('Nothing else to do')
    return
  } else {
    log.info('Waiting for transactions to end')
  }

  log.info(`Found ${failedTransactions.length} failed transactions`)

  if (failedTransactions.length > 0 && ignoreFailedTxs !== false) {
    log.info('-------------------------------')
    log.info(`Retrying ${failedTransactions.length} failed transactions`)
    const failedParcels = failedTransactions.reduce(
      (allParcels, tx) => allParcels.concat(tx.data),
      []
    )
    return await assignParcels(parcels, newOwner, options)
  }

  log.info('All done!')
}

async function assignMultipleParcels(parcelsToAssign, newOwner) {
  const hash = await landRegistry.assignMultipleParcels(
    parcelsToAssign,
    newOwner
  )
  log.info(
    `Setting ${newOwner} owner for ${parcelsToAssign.length} parcels: ${hash}`
  )
  return { hash, data: parcelsToAssign, status: 'pending' }
}

async function getFailedTransactions(transactions) {
  log.info(`Waiting for ${transactions.length} transactions`)
  const completedTransactions = await waitForTransactions(transactions, web3)
  return completedTransactions.filter(tx => tx.status === 'failed')
}

async function run(args, configuration) {
  const { account, password, owner, parcels } = args
  const { batchSize, landsPerAssign, ignoreFailedTxs } = args
  const { txConfig, contractAddresses } = configuration

  const landRegistryContract = await LANDRegistryArtifact.at(
    contractAddresses.LANDRegistry
  )
  landRegistry = new LANDRegistryDecorator(
    landRegistryContract,
    account,
    txConfig
  )

  await assignParcels(parcels, owner, {
    batchSize: Number(batchSize),
    landsPerAssign: Number(landsPerAssign),
    ignoreFailedTxs
  })
}

const scriptRunner = new ScriptRunner(web3, {
  onHelp: () =>
    console.log(`Deploy (set an owner for) a list of unowned parcels. To run, use:

truffle exec assignParcels.js --parcels genesis.json --account 0x --password 123 --owner 0x --network ropsten (...)

--parcels genesis.json   - List of parcels to deploy. Required
--account 0xdeadbeef     - Which account to use to deploy. Required
--password S0m3P4ss      - Password for the account.
--owner 0xdeadbeef       - The new owner to be used. Required
--batchSize 50           - Simultaneous transactions. Default ${BATCH_SIZE}
--landsPerAssign 50      - Parcels per assign transaction. Default ${LANDS_PER_ASSIGN}
--ignoreFailedTxs        - If this flag is present, the script will *not* try to re-send failed transactions
--logLevel debug         - Log level to use. Possible values: info, debug. Default: info

`),
  onRun: run
})

// This enables the script to be executed by a node binary
if (require.main === module) {
  scriptRunner.getRunner('console', process.argv, REQUIRED_ARGS)()
}

// This enables the script to be executed by `truffle exec`
module.exports = scriptRunner.getRunner('truffle', process.argv, REQUIRED_ARGS)
