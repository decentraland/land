const {
  log,
  setLogLevel,
  checkRequiredArgs,
  parseArgs,
  getConfiguration,
  expandPath,
  readJSON
} = require('./utils')

class ScriptRunner {
  constructor({ onHelp, onRun }) {
    this.onHelp = onHelp
    this.onRun = onRun
    this.web3 = null
  }

  getRunner(argv, requiredArgs) {
    return async callback => {
      try {
        // The `.slice(4)` removes the path to node itself, the file name and both 'truffle' and 'exec'
        await this.main(argv.slice(4), requiredArgs)
      } finally {
        callback && callback()
      }
    }
  }

  async main(argv, requiredArgs) {
    try {
      // the `+ 1` means argument name *and* value
      if (argv.length <= requiredArgs.length + 1 || argv[0] === 'help') {
        this.onHelp(argv)
      } else {
        const args = parseArgs(argv)

        checkRequiredArgs(args, requiredArgs)

        setLogLevel(args.logLevel)
        log.info('Using args', JSON.stringify(args, null, 2))

        const configuration = getConfiguration()
        const { account, password } = args

        args.parcels = args.parcels ? readJSON(expandPath(args.parcels)) : []

        await this.onRun(args, configuration)
      }
    } catch (error) {
      log.error(error)
      throw new Error(error)
    }
  }
}

module.exports = ScriptRunner
