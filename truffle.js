require('babel-register');
require('babel-polyfill');

const HDWalletProvider = require('truffle-hdwallet-provider')
const mnemonic = ''

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      gas: 10000000,
      network_id: "*" // Match any network id
    },
    ropsten: {
      provider: new HDWalletProvider(mnemonic, 'https://ropsten.infura.io/'),
      network_id: 3, // official id of the ropsten network
      gas: 3000000 
    }
  }
};
