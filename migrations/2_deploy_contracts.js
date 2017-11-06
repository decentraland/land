const LANDTerraformSale = artifacts.require('./LANDTerraformSale.sol')

module.exports = function (deployer) {
  deployer.deploy(LANDTerraformSale)
}
