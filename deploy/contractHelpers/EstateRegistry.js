const { GAS_PRICE, GAS_LIMIT } = require('./txParams')
const { log } = require('../utils')

class EstateRegistry {
  constructor(account, address, txConfig) {
    this.account = account
    this.address = address
    this.txConfig = {
      gasPrice: GAS_PRICE,
      gas: GAS_LIMIT,
      from: account,
      ...txConfig
    }

    this.contract = null
  }

  async setContract(artifacts) {
    const artifact = artifacts.require('EstateRegistry')
    this.contract = await artifact.at(this.address)
    return this
  }

  async getCurrentOwner(estateId) {
    return await this.contract.ownerOf(estateId, this.txConfig)
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
