export default async function createEstateFull(
  contracts,
  xs,
  ys,
  owner,
  metadata,
  sendParams
) {
  const { land, estate } = contracts

  if (metadata) {
    await land.createEstateWithMetadata(xs, ys, owner, metadata, sendParams)
  } else {
    await land.createEstate(xs, ys, owner, sendParams)
  }

  const tokenCount = await estate.balanceOf.call(owner)
  const token = await estate.tokenOfOwnerByIndex(
    owner,
    tokenCount.toNumber() - 1
  )

  return token.toString()
}
