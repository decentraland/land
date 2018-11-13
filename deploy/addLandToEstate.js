const ScriptRunner = require('./ScriptRunner')
const { log, unlockWeb3Account, waitForTransaction } = require('./utils')
const { LANDRegistry } = require('./contractHelpers')

const MAX_LAND_PER_TX = 12
const BATCH_SIZE = 1
const REQUIRED_ARGS = ['account', 'estateId', 'parcels']

async function addLandToEstate(parcels, estateId, options, contracts) {
  const { batchSize = BATCH_SIZE, retryFailedTxs } = options
  const { landRegistry, web3 } = contracts
  let parcelsAdded = 0
  let runningTransactions = []
  let failedTransactions = []

  while (parcelsAdded < parcels.length) {
    const parcelsToAdd = parcels.slice(
      parcelsAdded,
      parcelsAdded + MAX_LAND_PER_TX
    )
    const hash = await landRegistry.transferManyLandToEstate(
      parcelsToAdd,
      estateId
    )
    log.info(
      `Assigned ${parcelsToAdd.length} parcels to estate ${estateId}: ${hash}`
    )

    runningTransactions.push({ hash, data: parcelsToAdd, status: 'pending' })

    if (runningTransactions.length >= batchSize) {
      failedTransactions = failedTransactions.concat(
        await getFailedTransactions(runningTransactions, web3)
      )
      runningTransactions = []
    }

    parcelsAdded += MAX_LAND_PER_TX
  }

  if (runningTransactions.length > 0) {
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
    return await addLandToEstate(parcels, estateId, options, contracts)
  } else {
    log.info(`Failed transactions: ${failedTransactions.map(t => t.hash)}`)
  }
}

async function run(args, configuration) {
  const { account, password, estateId, parcels } = args
  const { batchSize, retryFailedTxs } = args
  const { txConfig, contractAddresses } = configuration

  const landRegistry = new LANDRegistry(account, txConfig)
  await landRegistry.setContract(artifacts, contractAddresses.LANDRegistry)

  await unlockWeb3Account(web3, account, password)

  await addLandToEstate(
    estateId,
    parcels,
    { batchSize: +batchSize, retryFailedTxs },
    { landRegistry, web3 }
  )
}

const scriptRunner = new ScriptRunner({
  onHelp: () =>
    console.log(`Add LAND to an already created Estate. To run, use:

truffle exec addLandToEstate.js --estateId 22 --parcels genesis.json --account 0x --password 123 --network ropsten (...)

--estateId 22            - Blockchain estate id. Required
--parcels genesis.json   - List of parcels to add to the estate. It'll be truncated if it's longer than ${MAX_LAND_PER_TX}
--account 0xdeadbeef     - Which account to use to deploy. Required
--password S0m3P4ss      - Password for the account.
--retryFailedTxs         - If this flag is present, the script will try to retry failed transactions
--logLevel debug         - Log level to use. Possible values: info, debug. Default: info

`),
  onRun: run
})

// This enables the script to be executed by `truffle exec` and to be exported
const runner = scriptRunner.getRunner(process.argv, REQUIRED_ARGS)
runner.addLandToEstate = addLandToEstate
module.exports = runner
