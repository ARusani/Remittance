const Remittance = artifacts.require('./Remittance.sol');

module.exports = async (deployer) => {
  const maxFarInTheFuture = 220752000;
  await deployer.deploy(Remittance, maxFarInTheFuture, false);
};


