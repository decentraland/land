require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    livenet: {
      host: "172.0.17.1",
      port: 8546,
      gas: 70000000,
      network_id: "*" // Match any network id
    },
    development: {
      host: "localhost",
      port: 18545,
      gas: 100000000,
      network_id: "*" // Match any network id
    },
    ropsten: {
      host: "localhost",
      port: 18545,
      network_id: 3, // official id of the ropsten network
      gas: 30000000
    }
  }
};
