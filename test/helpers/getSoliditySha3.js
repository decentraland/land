import abi from 'ethereumjs-abi'
import util from 'ethereumjs-util'

export function getSoliditySha3(salt, value) {
  return (
    '0x' +
    abi.soliditySHA3(['string', 'uint256'], [salt, value]).toString('hex')
  )
}

// web3 0.20's BigNumber defaults to scientific notation for large values
// (e.g. 3.40282...e+38), which ethereumjs-abi.rawEncode rejects. Force base-10.
function toDec(v) {
  return typeof v === 'string' || typeof v === 'number'
    ? v.toString()
    : v.toString(10)
}

// Mirrors the on-chain getFingerprint after the abi.encode patch:
// keccak256(abi.encode("estateId", estateId, estateLandIds[estateId]))
export function getEstateFingerprint(estateId, landIds) {
  const encoded = abi.rawEncode(
    ['string', 'uint256', 'uint256[]'],
    ['estateId', toDec(estateId), landIds.map(toDec)]
  )
  return '0x' + util.sha3(encoded).toString('hex')
}

// The pre-patch XOR construction. Kept so a test can assert the new
// fingerprint diverges from the broken algorithm.
export function getXorFingerprint(estateId, landIds) {
  const result = Buffer.from(
    abi.soliditySHA3(['string', 'uint256'], ['estateId', toDec(estateId)])
  )
  for (const landId of landIds) {
    const landHash = abi.soliditySHA3(['uint256'], [toDec(landId)])
    for (let i = 0; i < 32; i++) result[i] ^= landHash[i]
  }
  return '0x' + result.toString('hex')
}
