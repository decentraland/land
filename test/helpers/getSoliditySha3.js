import abi from 'ethereumjs-abi'

export function getSoliditySha3(value) {
  return '0x' + abi.soliditySHA3(['uint256'], [value]).toString('hex')
}
