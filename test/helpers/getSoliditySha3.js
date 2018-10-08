import abi from 'ethereumjs-abi'

export function getSoliditySha3(salt, value) {
  return (
    '0x' +
    abi.soliditySHA3(['string', 'uint256'], [salt, value]).toString('hex')
  )
}
