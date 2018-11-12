const ScriptRunner = require('./ScriptRunner')
const { log, waitForTransaction } = require('./utils')

const LANDRegistryArtifact = artifacts.require('LANDRegistry')
const { LANDRegistryDecorator } = require('./ContractDecorators')
let landRegistry

const EstateRegistryArtifact = artifacts.require('EstateRegistry')
const { EstateRegistryDecorator } = require('./ContractDecorators')
let estateRegistry

const MAX_LAND_PER_TX = 12
const REQUIRED_ARGS = ['account']

async function createEstate(parcels, owner, data, options) {
  const { ignoreFailedTxs } = options
  if (parcels.length > MAX_LAND_PER_TX) {
    log.warn(
      `Got ${parcels.length} parcels but the max per tx is ${MAX_LAND_PER_TX}`
    )
    log.warn(
      `This script will deploy only the first ${MAX_LAND_PER_TX} parcels`
    )
    parcels = parcels.slice(0, MAX_LAND_PER_TX)
  }

  const hash = await landRegistry.createEstate(parcels, owner, data)
  log.info(`Created new Estate: ${hash}`)

  const transaction = await waitForTransaction(
    { hash, data: {}, status: 'pending' },
    web3
  )

  if (transaction.status === 'failed' && ignoreFailedTxs !== false) {
    log.info('--------------------------------')
    log.info(`Estate creation failed, retrying`)
    return await createEstate(parcels, owner, data, options)
  }

  const estateId = await estateRegistry.getOwnerLastTokenId(owner)
  log.info(`Estate ${estateId} created with ${parcels.length} parcels`)

  log.info('All done!')
}

async function run(args) {
  const { account, password, owner, data, parcels } = args
  const { ignoreFailedTxs } = args
  const { txConfig, contractAddresses } = configuration

  const estateRegistryContract = await EstateRegistryArtifact.at(
    contractAddresses.EstateRegistry
  )
  estateRegistry = new EstateRegistryDecorator(
    estateRegistryContract,
    account,
    txConfig
  )

  await createEstate(parcels, owner || account, data, {
    ignoreFailedTxs
  })
}

const scriptRunner = new ScriptRunner(web3, {
  onHelp: () =>
    console.log(`Create a new Estate. To run, use:

truffle exec createEstate.js --parcels genesis.json --account 0x --password 123 --owner 0x --network ropsten (...)

--parcels genesis.json          - List of parcels to add to the estate on the first transaction. It'll be truncated if it's longer than ${MAX_LAND_PER_TX}
--account 0xdeadbeef            - Which account to use to deploy. Required
--password S0m3P4ss             - Password for the account.
--owner 0xdeadbeef              - The owner of the estate. If undefined, the account will be used
--data 'version,name,desc,ipns' - Estate metadata
--ignoreFailedTxs               - If this flag is present, the script will *not* try to re-send failed transactions
--logLevel debug                - Log level to use. Possible values: info, debug. Default: info

`),
  onRun: run
})

// This enables the script to be executed by a node binary
if (require.main === module) {
  scriptRunner.getRunner('console', process.argv, REQUIRED_ARGS)()
}

// This enables the script to be executed by `truffle exec`
module.exports = scriptRunner.getRunner('truffle', process.argv, REQUIRED_ARGS)
