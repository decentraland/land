const TerraformLandSell = artifacts.require('./TerraformLandSell.sol')

module.exports = function (deployer) {
  deployer.deploy(TerraformLandSell)
}
