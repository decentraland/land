const {
  log,
  setLogLevel,
  checkRequiredArgs,
  parseArgs,
  getConfiguration,
  expandPath,
  readJSON,
  checkWeb3Account
} = require('./utils')

class ScriptRunner {
  constructor(web3, { onHelp, onRun }) {
    this.web3 = web3

    this.onHelp = onHelp
    this.onRun = onRun
  }

  getRunner(type, argv, requiredArgs) {
    return async callback => {
      try {
        // The `.slice(2)` removes the path to node itself and the file name from the argvs
        // The `.slice(4)` removes the path to node itself, the file name and both 'truffle' and 'exec'
        argv = type === 'truffle' ? argv.slice(4) : argv.slice(2)
        await this.main(argv, requiredArgs)
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
        checkWeb3Account(this.web3, args.account)

        setLogLevel(args.logLevel)
        log.info('Using args', JSON.stringify(args, null, 2))

        const configuration = getConfiguration()
        const { account, password } = args

        if (password) {
          log.debug(`Unlocking account ${account}`)
          await this.web3.personal.unlockAccount(account, password, 10000)
        }

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
