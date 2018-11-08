const https = require('https')
const fs = require('fs')

const log = {
  info(...args) {
    console.log('[INFO]', ...args)
  },
  debug() {},
  error(...args) {
    console.error('[ERROR]', ...args)
  }
}

function setLogLevel(logLevel = 'info') {
  if (logLevel.toLowerCase() === 'debug') {
    log.debug = (...args) => {
      console.log('[DEBUG]', ...args)
    }
  }
}

function parseArgs(args) {
  const parsedArgs = {}
  let lastArgName = ''

  for (const arg of args) {
    if (arg.startsWith('--')) {
      lastArgName = arg.slice(2)
    } else {
      parsedArgs[lastArgName] = arg
    }
  }

  return parsedArgs
}

function getConfiguration(filepath = `${__dirname}/configuration.json`) {
  log.debug(`Gettting configuration file "${filepath}"`)
  return readJSON(filepath)
}

function readJSON(filepath) {
  let json
  try {
    log.debug(`Reading JSON file "${filepath}"`)
    const fileContent = fs.readFileSync(filepath).toString()
    json = JSON.parse(fileContent)
  } catch (error) {
    log.error(`Error trying to read file "${filepath}"`)
    throw error
  }
  return json
}

function requestJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, resp => {
        let data = ''
        resp.on('data', chunk => (data += chunk))
        resp.on('end', () => resolve(JSON.parse(data)))
      })
      .on('error', err => reject('Error: ' + err.message))
  })
}

module.exports = {
  log,
  setLogLevel,
  parseArgs,
  getConfiguration,
  readJSON,
  requestJSON
}
