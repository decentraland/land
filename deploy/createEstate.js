const {
  log,
  setLogLevel,
  checkRequiredArgs,
  parseArgs,
  getConfiguration,
  expandPath,
  readJSON,
  checkWeb3Account,
  waitForTransaction
} = require('./utils')

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
  checkRequiredArgs(args, REQUIRED_ARGS)
  checkWeb3Account(web3, args.account)

  setLogLevel(args.logLevel)
  log.info('Using args', JSON.stringify(args, null, 2))

  const configuration = getConfiguration()
  const estateParcels = args.parcels ? readJSON(expandPath(args.parcels)) : []

  const { account, password, owner, data } = args
  const { ignoreFailedTxs } = args
  const { txConfig, contractAddresses } = configuration

  if (password) {
    log.debug(`Unlocking account ${account}`)
    await this.web3.personal.unlockAccount(account, password, 10000)
  }

  const landRegistryContract = await LANDRegistryArtifact.at(
    contractAddresses.LANDRegistry
  )
  landRegistry = new LANDRegistryDecorator(
    landRegistryContract,
    account,
    txConfig
  )

  const estateRegistryContract = await EstateRegistryArtifact.at(
    contractAddresses.EstateRegistry
  )
  estateRegistry = new EstateRegistryDecorator(
    estateRegistryContract,
    account,
    txConfig
  )

  await createEstate(estateParcels, owner || account, data, {
    ignoreFailedTxs
  })
}

async function main(argv) {
  try {
    if (argv.length < REQUIRED_ARGS.length || argv[0] === 'help') {
      console.log(`Deploy (set an owner for) a list of unowned parcels. To run, use:

truffle exec createEstate.js --parcels genesis.json --account 0x --password 123 --owner 0x --network ropsten (...)

--parcels genesis.json          - List of parcels to add to the estate on the first transaction. It'll be truncated if it's longer than ${MAX_LAND_PER_TX}
--account 0xdeadbeef            - Which account to use to deploy. Required
--password S0m3P4ss             - Password for the account.
--owner 0xdeadbeef              - The owner of the estate. If undefined, the account will be used
--data 'version,name,desc,ipns' - Estate metadata
--ignoreFailedTxs               - If this flag is present, the script will *not* try to re-send failed transactions
--logLevel debug                - Log level to use. Possible values: info, debug. Default: info

`)
    } else {
      await run(parseArgs(argv))
    }
  } catch (error) {
    log.error(error)
    throw new Error(error)
  }
}

// This enables the script to be executed by a node binary
// The `.slice(2)` removes the path to node itself and the file name from the argvs
if (require.main === module) {
  main(process.argv.slice(2))
}

// This enables the script to be executed by `truffle exec`
// The `.slice(4)` removes the path to node itself, the file name and both 'truffle' and 'exec'
module.exports = async function(callback) {
  try {
    await main(process.argv.slice(4))
  } finally {
    callback()
  }
}
