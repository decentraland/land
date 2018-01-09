export const EVMRevert = 'revert'
export const EVMThrow = 'invalid opcode'

export function sum(values) {
  return values.reduce((sum, value) => sum + value, 0)
}
