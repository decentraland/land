const { GAS_PRICE, GAS_LIMIT } = require('./txParams')
const { log } = require('../utils')

class LANDRegistryDecorator {
  constructor(contract, account, txConfig = {}) {
    this.contract = contract
    this.account = account
    this.txConfig = {
      gasPrice: GAS_PRICE,
      gas: GAS_LIMIT,
      from: account,
      ...txConfig
    }
  }

  async getCurrentOwner(parcel) {
    return await this.contract.ownerOfLand(parcel.x, parcel.y, this.txConfig)
  }

  async assignMultipleParcels(parcels, newOwner) {
    const { xs, ys } = this.getXYPairs(parcels)

    return await this.contract.assignMultipleParcels.sendTransaction(
      xs,
      ys,
      newOwner,
      this.txConfig
    )
  }

  async createEstate(parcels, owner, data = '') {
    const { xs, ys } = this.getXYPairs(parcels)

    return data
      ? this.contract.createEstateWithMetadata.sendTransaction(
          xs,
          ys,
          owner,
          data,
          this.txConfig
        )
      : this.contract.createEstate.sendTransaction(xs, ys, owner, this.txConfig)
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
