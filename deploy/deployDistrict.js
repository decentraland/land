// ./deployDistrict --parcels ./genesis.json --account -0x --batch 200 --owner 0x --logLevel debug

const {
  log,
  setLogLevel,
  parseArgs,
  getConfiguration,
  readJSON
} = require('./utils')

async function run(args) {
  log.debug('Using args', args)
  setLogLevel(args.logLevel)

  const configuration = getConfiguration()
  const parcelsToDeploy = readJSON(args.parcels)

  console.log('*********************************************')
  console.log(args, configuration, parcelsToDeploy)
  console.log('*********************************************')
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2))
  run(args)
}
