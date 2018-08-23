require('babel-register')
require('babel-polyfill')

const HDWalletProvider = require('truffle-hdwallet-provider')
const mnemonic = '' // 12 word mnemonic

module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    livenet: {
      host: 'localhost',
      port: 8545,
      gas: 70000000,
      network_id: '*'
    },
    development: {
      host: 'localhost',
      port: 18545,
      gas: 100000000,
      network_id: '*'
    },
    ropsten: {
      host: 'localhost',
      port: 8545,
      network_id: 3,
      gas: 30000000
    },
    infura_ropsten: {
      provider: () =>
        new HDWalletProvider(mnemonic, 'https://ropsten.infura.io/'),
      network_id: 3,
      gas: 30000000
    }
  }
}
