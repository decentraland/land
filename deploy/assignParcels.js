const ScriptRunner = require('./ScriptRunner')
const {
  log,
  unlockWeb3Account,
  getFailedTransactions,
  isEmptyAddress
} = require('./utils')
const { LANDRegistry } = require('./contractHelpers')

const LANDS_PER_ASSIGN = 50
const BATCH_SIZE = 1
const REQUIRED_ARGS = ['parcels', 'account', 'owner']

/* TX = { hash, data, status } */
async function assignParcels(parcels, newOwner, options, contracts) {
  let { batchSize, landsPerAssign, retryFailedTxs } = options
  const { landRegistry, web3 } = contracts

  let runningTransactions = []
  let failedTransactions = []
  let parcelsToAssign = []

  batchSize = batchSize || BATCH_SIZE
  landsPerAssign = landsPerAssign || LANDS_PER_ASSIGN

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

    // Assign `landsPerAssign` parcels
    if (parcelsToAssign.length >= landsPerAssign) {
      const transaction = await assignMultipleParcels(
        parcelsToAssign,
        newOwner,
        landRegistry
      )
      runningTransactions.push(transaction)
      parcelsToAssign = []
    }

    // Wait for `batchSize` transactions
    if (runningTransactions.length >= batchSize) {
      failedTransactions = failedTransactions.concat(
        await getFailedTransactions(runningTransactions, web3)
      )
      runningTransactions = []
    }
  }

  // Cleanup
  if (parcelsToAssign.length > 0) {
    const transaction = await assignMultipleParcels(
      parcelsToAssign,
      newOwner,
      landRegistry
    )
    runningTransactions.push(transaction)
    failedTransactions = failedTransactions.concat(
      await getFailedTransactions(runningTransactions, web3)
    )
  }

  if (failedTransactions.length === 0) {
    log.info('Nothing else to do')
    return
  } else {
    log.info('Waiting for transactions to end')
  }

  log.info(`Found ${failedTransactions.length} failed transactions`)

  if (failedTransactions.length > 0 && retryFailedTxs != null) {
    log.info(`Retrying ${failedTransactions.length} failed transactions\n\n`)
    const failedParcels = failedTransactions.reduce(
      (allParcels, tx) => allParcels.concat(tx.data),
      []
    )
    return await assignParcels(parcels, newOwner, options, contracts)
  } else {
    log.info(`Failed transactions: ${failedTransactions.map(t => t.hash)}`)
  }
}

async function assignMultipleParcels(parcelsToAssign, newOwner, landRegistry) {
  const hash = await landRegistry.assignMultipleParcels(
    parcelsToAssign,
    newOwner
  )
  log.info(
    `Setting ${newOwner} owner for ${parcelsToAssign.length} parcels: ${hash}`
  )
  return { hash, data: parcelsToAssign, status: 'pending' }
}

async function run(args, configuration) {
  const { account, password, owner, parcels } = args
  const { batchSize, landsPerAssign, retryFailedTxs } = args
  const { txConfig, contractAddresses } = configuration
  const { LANDRegistry: landRegistryAddress } = contractAddresses

  const landRegistry = new LANDRegistry(account, landRegistryAddress, txConfig)
  await landRegistry.setContract(artifacts)

  await unlockWeb3Account(web3, account, password)

  await assignParcels(
    parcels,
    owner,
    { batchSize: +batchSize, landsPerAssign: +landsPerAssign, retryFailedTxs },
    { landRegistry, web3 }
  )
}

const scriptRunner = new ScriptRunner({
  onHelp: () =>
    console.log(`Deploy (set an owner for) a list of unowned parcels. To run, use:

truffle exec assignParcels.js --parcels genesis.json --account 0x --password 123 --owner 0x --network ropsten (...)

Available flags:

--parcels genesis.json   - List of parcels to deploy. Required
--account 0xdeadbeef     - Which account to use to deploy. Required
--password S0m3P4ss      - Password for the account.
--owner 0xdeadbeef       - The new owner to be used. Required
--batchSize 50           - Simultaneous transactions. Default ${BATCH_SIZE}
--landsPerAssign 50      - Parcels per assign transaction. Default ${LANDS_PER_ASSIGN}
--retryFailedTxs         - If this flag is present, the script will try to retry failed transactions
--logLevel debug         - Log level to use. Possible values: info, debug. Default: info

`),
  onRun: run
})

// This enables the script to be executed by `truffle exec` and to be exported
const runner = scriptRunner.getRunner(process.argv, REQUIRED_ARGS)
runner.assignParcels = assignParcels
module.exports = runner
