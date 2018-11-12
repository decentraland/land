const { GAS_PRICE, GAS_LIMIT } = require('./txParams')
const { log } = require('../utils')

class EstateRegistry {
  constructor(contract, account, txConfig) {
    this.contract = null
    this.account = account
    this.txConfig = {
      gasPrice: GAS_PRICE,
      gas: GAS_LIMIT,
      from: account,
      ...txConfig
    }
  }

  async setContract(artifacts, address) {
    artifact = artifacts.require('EstateRegistry')
    this.contract = await artifact.at(address)
    return this
  }

  async getOwnerLastTokenId(owner) {
    const tokenCount = await this.contract.balanceOf.call(owner)
    const token = await this.contract.tokenOfOwnerByIndex(
      owner,
      tokenCount.toNumber() - 1
    )

    return token.toString()
  }
}

module.exports = EstateRegistry
