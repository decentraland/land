require('babel-register');
require('babel-polyfill');

const HDWalletProvider = require('truffle-hdwallet-provider')
const mnemonic = ''

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 18545,
      gas: 10000000,
      network_id: "*" // Match any network id
    },
    ropsten: {
      host: "localhost",
      port: 18545,
      network_id: 3, // official id of the ropsten network
      gas: 3000000
    }
  }
};
