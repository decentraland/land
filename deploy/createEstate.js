const ScriptRunner = require('./ScriptRunner')
const { log, waitForTransaction } = require('./utils')
const { LANDRegistry, EstateRegistry } = require('./contractHelpers')
const addLandToEstate = require('./addLandToEstate').addLandToEstate

const MAX_LAND_PER_TX = 12
const REQUIRED_ARGS = ['account']

async function createEstate(parcels, owner, data, options, contracts) {
  const { retryFailedTxs } = options
  const { landRegistry, estateRegistry } = contracts

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

  log.info('--------------------------------')

  if (transaction.status === 'failed' && retryFailedTxs != null) {
    log.info('Estate creation failed, retrying')
    return await createEstate(parcels, owner, data, options, contracts)
  }

  const estateId = await estateRegistry.getOwnerLastTokenId(owner)

  const restParcelBatch = parcels.slice(MAX_LAND_PER_TX)
  await addLandToEstate(restParcelBatch, estateId, {}, { landRegistry })
  log.info(`Estate ${estateId} created with ${parcels.length} parcels`)
}

async function run(args) {
  const { account, password, owner, data, parcels } = args
  const { retryFailedTxs } = args
  const { txConfig, contractAddresses } = configuration

  landRegistry = new LANDRegistry(account, txConfig)
  await landRegistry.setContract(artifacts, contractAddresses.EstateRegistry)

  estateRegistry = new EstateRegistry(account, txConfig)
  await estateRegistry.setContract(artifacts, contractAddresses.EstateRegistry)

  await createEstate(
    parcels,
    owner || account,
    data,
    { retryFailedTxs },
    { landRegistry, estateRegistry }
  )
}

const scriptRunner = new ScriptRunner(web3, {
  onHelp: () =>
    console.log(`Create a new Estate. To run, use:

truffle exec createEstate.js --parcels genesis.json --account 0x --password 123 --owner 0x --network ropsten (...)

--parcels genesis.json          - List of parcels to add to the estate.
--account 0xdeadbeef            - Which account to use to deploy. Required
--password S0m3P4ss             - Password for the account.
--owner 0xdeadbeef              - The owner of the estate. If undefined, the account will be used
--data 'version,name,desc,ipns' - Estate metadata
--retryFailedTxs                - If this flag is present, the script will try to retry failed transactions
--logLevel debug                - Log level to use. Possible values: info, debug. Default: info

`),
  onRun: run
})

// This enables the script to be executed by a node binary
if (require.main === module) {
  scriptRunner.getRunner('console', process.argv, REQUIRED_ARGS)()
}

// This enables the script to be executed by `truffle exec`
const runner = scriptRunner.getRunner('truffle', process.argv, REQUIRED_ARGS)
runner.createEstate = createEstate
module.exports = runner
