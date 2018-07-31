export const ESTATE_NAME = 'Estate'
export const ESTATE_SYMBOL = 'EST'

export const LAND_NAME = 'Decentraland LAND'
export const LAND_SYMBOL = 'LAND'

export default async function setupContracts(creator) {
  const creationParams = {
    gas: 7e6,
    gasPrice: 1e9,
    from: creator
  }
  const sentByCreator = { ...creationParams, from: creator }

  const LANDRegistry = artifacts.require('LANDRegistryTest')
  const EstateRegistry = artifacts.require('EstateRegistryTest')
  const LANDProxy = artifacts.require('LANDProxy')

  const proxy = await LANDProxy.new(creationParams)
  const registry = await LANDRegistry.new(creationParams)

  await proxy.upgrade(registry.address, creator, sentByCreator)

  const estate = await EstateRegistry.new(
    ESTATE_NAME,
    ESTATE_SYMBOL,
    proxy.address,
    creationParams
  )

  const land = await LANDRegistry.at(proxy.address)
  await land.initialize(creator, sentByCreator)
  await land.setEstateRegistry(estate.address)

  return {
    proxy,
    registry,
    estate,
    land
  }
}
