const ScriptRunner = require('./ScriptRunner')
const { log, unlockWeb3Account, waitForTransaction } = require('./utils')
const { LANDRegistry, EstateRegistry } = require('./contractHelpers')
const addLandToEstate = require('./addLandToEstate').addLandToEstate

const MAX_LAND_PER_TX = 10
const REQUIRED_ARGS = ['account']

async function createEstate(parcels, owner, data, options, contracts) {
  const { batchSize, retryFailedTxs } = options
  const { landRegistry, estateRegistry, web3 } = contracts

  if (parcels.length > MAX_LAND_PER_TX) {
    log.warn(
      `Got ${parcels.length} parcels but the max per tx is ${MAX_LAND_PER_TX}`
    )
    log.warn(
      `The first transaction WILL DEPLOY ONLY the first ${MAX_LAND_PER_TX} parcels`
    )
  }

  const firstParcelBatch = parcels.slice(0, MAX_LAND_PER_TX)
  const hash = await landRegistry.createEstate(firstParcelBatch, owner, data)
  log.info(`Created new Estate: ${hash}`)

  const transaction = await waitForTransaction(
    { hash, status: 'pending' },
    web3
  )

  if (transaction.status === 'failed') {
    if (retryFailedTxs != null) {
      log.info('Estate creation failed, retrying\n\n')
      return await createEstate(parcels, owner, data, options, contracts)
    } else {
      log.info('Estate creation failed')
      return
    }
  }

  const estateId = await estateRegistry.getOwnerLastTokenId(owner)
  log.info(`Estate ${estateId} created with ${parcels.length} parcels`)

  if (parcels.length > MAX_LAND_PER_TX) {
    log.info(`Adding the other ${parcels.length - MAX_LAND_PER_TX} parcles`)
    const restParcelBatch = parcels.slice(MAX_LAND_PER_TX)
    await addLandToEstate(
      restParcelBatch,
      estateId,
      { batchSize },
      { landRegistry, estateRegistry }
    )
  }
}

async function run(args, configuration) {
  const { account, password, owner, data, parcels } = args
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

  await createEstate(
    parcels,
    owner || account,
    data,
    { batchSize, retryFailedTxs },
    { landRegistry, estateRegistry, web3 }
  )
}

const scriptRunner = new ScriptRunner({
  onHelp: () =>
    console.log(`Create a new Estate. To run, use:

truffle exec createEstate.js --parcels genesis.json --account 0x --password 123 --owner 0x --network ropsten (...)

Available flags:

--parcels genesis.json          - List of parcels to add to the estate.
--account 0xdeadbeef            - Which account to use to deploy. Required
--password S0m3P4ss             - Password for the account.
--owner 0xdeadbeef              - The owner of the estate. If undefined, the account will be used
--data 'version,name,desc,ipns' - Estate metadata
--batchSize 50                  - Simultaneous land transactions. Default ${BATCH_SIZE}
--retryFailedTxs                - If this flag is present, the script will try to retry failed transactions
--logLevel debug                - Log level to use. Possible values: info, debug. Default: info

`),
  onRun: run
})

// This enables the script to be executed by `truffle exec` and to be exported
const runner = scriptRunner.getRunner(process.argv, REQUIRED_ARGS)
runner.createEstate = createEstate
module.exports = runner
