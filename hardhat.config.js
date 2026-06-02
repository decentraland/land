require('@babel/register')
require('@nomiclabs/hardhat-truffle5') // pulls in @nomiclabs/hardhat-web3

module.exports = {
  solidity: {
    version: '0.4.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      // Match the permissive ganache instance the tests used to run against:
      // a high block gas limit, no contract-size cap (the 0.4.x registries are
      // large), and accounts funded with 1M ETH for the high-value tests.
      blockGasLimit: 1000000000,
      allowUnlimitedContractSize: true,
      accounts: {
        accountsBalance: '1000000000000000000000000'
      }
    }
  },
  paths: {
    sources: './contracts',
    tests: './test'
  },
  mocha: {
    timeout: 200000
  }
}
