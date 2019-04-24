const Remittance = artifacts.require('./Remittance.sol');

module.exports = async (deployer) => {
  const latestBlock = await web3.eth.getBlock('latest');
  const maxFarInTheFuture = latestBlock.timestamp + 220752000;
  await deployer.deploy(Remittance, maxFarInTheFuture);
};


