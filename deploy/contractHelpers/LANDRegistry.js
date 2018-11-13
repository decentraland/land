const { GAS_PRICE, GAS_LIMIT } = require('./txParams')
const { log } = require('../utils')

class LANDRegistry {
  constructor(account, address, txConfig = {}) {
    this.address = address
    this.account = account
    this.txConfig = {
      gasPrice: GAS_PRICE,
      gas: GAS_LIMIT,
      from: account,
      ...txConfig
    }

    this.contract = null
  }

  async setContract(artifacts) {
    const artifact = artifacts.require('LANDRegistry')
    this.contract = await artifact.at(this.address)
    return this
  }

  async getCurrentOwner(parcel) {
    return await this.contract.ownerOfLand(parcel.x, parcel.y, this.txConfig)
  }

  async assignMultipleParcels(parcels, newOwner) {
    const { xs, ys } = this.getXYPairs(parcels)

    log.debug('Sending assignMultipleParcels\n', { xs, ys, newOwner })
    return await this.contract.assignMultipleParcels.sendTransaction(
      xs,
      ys,
      newOwner,
      this.txConfig
    )
  }

  async createEstate(parcels, owner, data = '') {
    const { xs, ys } = this.getXYPairs(parcels)

    if (data) {
      log.debug('Sending createEstateWithMetadata\n', { xs, ys, owner, data })
      return this.contract.createEstateWithMetadata.sendTransaction(
        xs,
        ys,
        owner,
        data,
        this.txConfig
      )
    } else {
      log.debug('Sending createEstate\n', { xs, ys, owner })
      return this.contract.createEstate.sendTransaction(
        xs,
        ys,
        owner,
        this.txConfig
      )
    }
  }

  async transferManyLandToEstate(parcels, estateId) {
    const { xs, ys } = this.getXYPairs(parcels)

    log.debug('Sending transferManyLandToEstate\n', { xs, ys, estateId })
    return await this.contract.transferManyLandToEstate.sendTransaction(
      xs,
      ys,
      estateId,
      this.txConfig
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

module.exports = LANDRegistry
