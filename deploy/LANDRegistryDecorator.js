const { log } = require('./utils')

const GAS_PRICE = 27000000000
const GAS_LIMIT = 1000000

class LANDRegistryDecorator {
  constructor(contract, account, txConfig) {
    this.contract = contract
    this.account = account
    this.txConfig = txConfig || { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT }
  }

  async getCurrentOwner(parcel) {
    return await this.contract.ownerOfLand(parcel.x, parcel.y)
  }

  async assignMultipleParcels(parcels, newOwner) {
    const { xs, ys } = this.getXYPairs(parcels)

    return await this.contract.assignMultipleParcels.sendTransaction(
      xs,
      ys,
      newOwner,
      { ...this.txConfig, from: this.account }
    )
  }

  getXYPairs(parcels) {
    const xs = []
    const ys = []
    for (let parcel of parcels) {
      xs.push(parcel.x)
      ys.push(parcel.y)
    }
    return { xs, ys }
  }
}

module.exports = LANDRegistryDecorator
