const { GAS_PRICE, GAS_LIMIT } = require('./txParams')
const { log } = require('../utils')

class EstateRegistryDecorator {
  constructor(contract, account, txConfig) {
    this.contract = contract
    this.account = account
    this.txConfig = {
      gasPrice: GAS_PRICE,
      gas: GAS_LIMIT,
      from: account,
      ...txConfig
    }
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

module.exports = EstateRegistryDecorator
