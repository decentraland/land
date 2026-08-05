// Minimal chai plugin providing `.bignumber.equal/gt/gte/lt/lte` for values
// that may be BN (what @truffle/contract returns), plain JS numbers, or
// decimal/hex strings.
//
// We can't use chai-bn or chai-bignumber directly here: chai-bn rejects plain
// JS-number arguments (this suite is full of numeric literals like
// `.bignumber.equal(5)`), while chai-bignumber rejects BN actuals (every
// contract call now returns BN). This bridges both by normalising each side to
// a BN via web3.utils.toBN before comparing.
const toBN = value => {
  if (typeof value === 'number') value = value.toString()
  return web3.utils.toBN(value)
}

module.exports = function(chai, utils) {
  chai.Assertion.addProperty('bignumber', function() {
    utils.flag(this, 'bignumber', true)
  })

  const overwrite = (names, predicate, okPhrase, notOkPhrase) =>
    names.forEach(name =>
      chai.Assertion.overwriteMethod(name, function(original) {
        return function(value) {
          if (utils.flag(this, 'bignumber')) {
            const actual = toBN(this._obj)
            const expected = toBN(value)
            this.assert(
              predicate(actual, expected),
              `expected ${actual} ${okPhrase} ${expected}`,
              `expected ${actual} ${notOkPhrase} ${expected}`
            )
          } else {
            original.apply(this, arguments)
          }
        }
      })
    )

  overwrite(
    ['equal', 'equals', 'eq'],
    (a, b) => a.eq(b),
    'to equal',
    'to not equal'
  )
  overwrite(
    ['above', 'gt', 'greaterThan'],
    (a, b) => a.gt(b),
    'to be above',
    'to not be above'
  )
  overwrite(
    ['least', 'gte'],
    (a, b) => a.gte(b),
    'to be at least',
    'to be below'
  )
  overwrite(
    ['below', 'lt', 'lessThan'],
    (a, b) => a.lt(b),
    'to be below',
    'to not be below'
  )
  overwrite(['most', 'lte'], (a, b) => a.lte(b), 'to be at most', 'to be above')
}
