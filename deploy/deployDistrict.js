// ./deployDistrict --parcels ./genesis.json --account -0x --batch 200 --owner 0x --logLevel debug

const {
  log,
  setLogLevel,
  parseArgs,
  getConfiguration,
  readJSON
} = require('./utils')

const REQUIRED_ARGS = ['parcels', 'account', 'batch', 'owner']

function checkRequiredArgs(args) {
  const hasRequiredArgs = REQUIRED_ARGS.every(argName => args[argName] != null)

  if (!hasRequiredArgs(args)) {
    const argNames = Object.keys(args)
    throw new Error(
      `Missing required arguments. Supplied ${argNames}, required ${REQUIRED_ARGS}`
    )
  }
}

async function run(args) {
  checkRequiredArgs(args)
  log.debug('Using args', args)
  setLogLevel(args.logLevel)

  const configuration = getConfiguration()
  const parcelsToDeploy = readJSON(args.parcels)

  console.log('*********************************************')
  console.log(args, configuration, parcelsToDeploy)
  console.log('*********************************************')
}

if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === 'help') {
    console.log(`Deploy (set an owner for) a list of unowned parcels. To run, use:

node deployDistrict --parcels ./genesis.json --account -0x --batch 200 --owner 0x --logLevel debug

--parcels ./genesis.json - List of parcels to deploy. Required
--account -0x            - Which account to use to deploy. Required
--batch 200              -
--owner 0x               - The new owner to be used. Required
--logLevel debug         - Log level to use. Possible values: info, debug. Default: info

`)
  } else {
    run(parseArgs(args))
  }
}
