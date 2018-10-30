require('babel-register')
require('babel-polyfill')

const HDWalletProvider = require('truffle-hdwallet-provider')
const mnemonic = '' // 12 word mnemonic

const createWalletProvider = (mnemonic, network = 'mainnet') => {
  return new HDWalletProvider(mnemonic, `https://${network}.infura.io/`)
}

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
    infura_mainnet: {
      provider: () => createWalletProvider(mnemonic, 'mainnet'),
      network_id: 1,
      gas: 30000000
    },
    infura_ropsten: {
      provider: () => createWalletProvider(mnemonic, 'ropsten'),
      network_id: 3,
      gas: 30000000
    }
  }
}
