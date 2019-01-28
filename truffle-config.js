require('babel-register')
require('babel-polyfill')

const HDWalletProvider = require('truffle-hdwallet-provider')

const createWalletProvider = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint)

const createInfuraProvider = (network = 'mainnet') =>
  createWalletProvider(
    process.env.MNEMONIC || '',
    `https://${network}.infura.io/${process.env.INFURA_API_KEY}`
  )

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
      from: '0x62ba62ff92917edf8ac0386fa10e3b27950bce8d',
      port: 8545,
      network_id: 3,
      gas: 30000000
    },
    infura_mainnet: {
      provider: () => createInfuraProvider('mainnet'),
      network_id: 1,
      gas: 30000000
    },
    infura_ropsten: {
      provider: () => createInfuraProvider('ropsten'),
      network_id: 3,
      gas: 30000000
    }
  }
}
