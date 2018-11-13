const ScriptRunner = require('./ScriptRunner')
const {
  log,
  unlockWeb3Account,
  getFailedTransactions,
  waitForTransaction
} = require('./utils')
const { LANDRegistry, EstateRegistry } = require('./contractHelpers')

const MAX_LAND_PER_TX = 10
const BATCH_SIZE = 1
const REQUIRED_ARGS = ['account', 'estateId', 'parcels']

async function addLandToEstate(allParcels, estateId, options, contracts) {
  let { batchSize, retryFailedTxs } = options
  const { landRegistry, estateRegistry, web3 } = contracts

  const parcels = []
  let parcelsAdded = 0
  let runningTransactions = []
  let failedTransactions = []

  batchSize = batchSize || BATCH_SIZE

  log.info(`Checking the owner of the estate ${estateId}`)
  const estateOwner = await estateRegistry.getCurrentOwner(estateId)
  if (estateOwner !== landRegistry.account) {
    throw new Error(
      `Owner "${estateOwner}" of ${estateId} isn't the current account`
    )
  }

  log.info(`Checking the owners of ${allParcels.length} parcels`)
  for (const parcel of allParcels) {
    log.debug(`Getting on chain owner for parcel ${parcel.x},${parcel.y}`)

    const owner = await landRegistry.getCurrentOwner(parcel)
    if (owner === landRegistry.account) {
      parcels.push(parcel)
    } else {
      log.debug(
        `Owner "${owner}" of ${parcel.x},${parcel.y} isn't the current account`
      )
    }
  }
  log.info(`Assigning ${parcels.length}/${allParcels.length} parcels`)

  while (parcelsAdded < parcels.length) {
    const start = parcelsAdded
    const end = parcelsAdded + MAX_LAND_PER_TX
    const parcelsToAdd = parcels.slice(start, end)

    log.debug(`Assigning parcels from ${start} to ${end}`)
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
  const {
    LANDRegistry: landRegistryAddress,
    EstateRegistry: estateRegistryAddress
  } = contractAddresses

  landRegistry = new LANDRegistry(account, landRegistryAddress, txConfig)
  await landRegistry.setContract(artifacts)

  estateRegistry = new EstateRegistry(account, estateRegistryAddress, txConfig)
  await estateRegistry.setContract(artifacts)

  await unlockWeb3Account(web3, account, password)

  try {
    await addLandToEstate(
      parcels,
      estateId,
      { batchSize: +batchSize, retryFailedTxs },
      { landRegistry, estateRegistry, web3 }
    )
  } catch (error) {
    log.error(
      'An error occurred trying to transfer the parcels. Check the `estateId`!'
    )
    throw error
  }
}

const scriptRunner = new ScriptRunner({
  onHelp: () =>
    console.log(`Add LAND to an already created Estate. To run, use:

truffle exec addLandToEstate.js --estateId 22 --parcels genesis.json --account 0x --password 123 --network ropsten (...)

Available flags:

--estateId 22            - Blockchain estate id. Required
--parcels genesis.json   - List of parcels to add to the estate. It'll be truncated if it's longer than ${MAX_LAND_PER_TX}
--account 0xdeadbeef     - Which account to use to deploy. Required
--password S0m3P4ss      - Password for the account.
--batchSize 50           - Simultaneous transactions. Default ${BATCH_SIZE}
--retryFailedTxs         - If this flag is present, the script will try to retry failed transactions
--logLevel debug         - Log level to use. Possible values: info, debug. Default: info

`),
  onRun: run
})

// This enables the script to be executed by `truffle exec` and to be exported
const runner = scriptRunner.getRunner(process.argv, REQUIRED_ARGS)
runner.addLandToEstate = addLandToEstate
module.exports = runner
