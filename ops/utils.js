const fs = require('fs')

const Utils = {}

Utils.readJSON = (filename) => {
  return JSON.parse(fs.readFileSync(filename).toString())
}

Utils.saveJSON = (filename, data) => {
  return fs.writeFileSync(filename, JSON.stringify(data, null, 2))
}

module.exports = Utils
