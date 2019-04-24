/* eslint-disable new-cap */
/* eslint-disable max-len */
/* eslint-disable one-var */
'use strict';

web3.eth.getTransactionReceiptMined = require('../gistLepretre/getTransactionReceiptMined.js');
web3.eth.expectedExceptionPromise = require('../gistLepretre/expected_exception_testRPC_and_geth.js');

const addEvmFunctions = require('../gistLepretre/evmFunctions.js');
addEvmFunctions(web3);

const {BN, toWei, sha3, soliditySha3, fromAscii} = web3.utils;
const {getBlock, getBalance, getTransaction} = web3.eth;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const duration = {
  seconds: function(value) {return value;},
  minutes: function(value) {return value * this.seconds(60);},
  hours: function(value) {return value * this.minutes(60);},
  days: function(value) {return value * this.hours(24);},
  weeks: function(value) {return value * this.days(7);},
  years: function(value) {return value * this.days(365);}
};

require('chai')
    .use(require('chai-as-promised'))
    .use(require('bn-chai')(BN))
    .should();

const Remittance = artifacts.require('Remittance.sol');

contract('Remittance', (accounts) => {
  const MAX_GAS = '4700000';

  let coinbase, alice, david, carol;
  before('checking accounts', async () => {
    assert.isAtLeast(accounts.length, 5, 'not enough accounts');

    coinbase = await web3.eth.getCoinbase();

    const coinbaseIndex = await accounts.indexOf(coinbase);
    // Remove the coinbase account
    if (coinbaseIndex > -1) {
      accounts.splice(coinbaseIndex, 1);
    }
    [alice, david, carol] = accounts;
  });

  describe('#Remittance()', () => {
    describe('costructor', () => {
      describe('should allowed', () => {
        it('and emit EventRemittanceCreated', async () => {
          const latestBlock = await getBlock('latest');
          const maxFarInTheFuture = latestBlock.timestamp + duration.years(1);

          const remittanceInstance = await Remittance.new(maxFarInTheFuture,
              {from: alice}).should.be.fulfilled;
          const receipt = await web3.eth.getTransactionReceiptMined(remittanceInstance.transactionHash);

          receipt.logs.length.should.be.equal(2);
          const logEventRemittanceCreted = receipt.logs[1];
          logEventRemittanceCreted.topics[0].should.be.equal(sha3('EventRemittanceCreated(address,uint256)'));
        });
      });

      describe('should fail', () => {
        it('if maxFarInTheFuture is in the past', async () => {
          const latestBlock = await getBlock('latest');
          const maxFarInTheFuture = latestBlock.timestamp - duration.seconds(10);

          await web3.eth.expectedExceptionPromise(() => {
            return Remittance.new(maxFarInTheFuture,
                {from: alice});
          }, MAX_GAS);
        });
      });
    });

    describe('Test Remittance Instance methods:', () => {
      let remittanceInstance, remittanceInstanceOne;

      const allowedPasswords = [
        {code1: sha3('ether'), code2: sha3('gwei'), etherAmount: toWei('0.5', 'ether')},
        {code1: sha3('Frankly, my dear, I do not give a damn.'), code2: sha3('After all, tomorrow is another day!”'), etherAmount: toWei('100', 'szabo')},
        {code1: sha3('May the Force be with you.'), code2: sha3('Do. Or do not. There is no try.'), etherAmount: toWei('1', 'ether')},
      ];

      let password;
      before('should deploy Remittance instance', async () => {
        const latestBlock = await getBlock('latest');
        const maxFarInTheFuture = latestBlock.timestamp + duration.hours(1);

        remittanceInstanceOne = await Remittance.new(maxFarInTheFuture,
            {from: alice}).should.be.fulfilled;
        password = await remittanceInstanceOne.otp(allowedPasswords[0].code1, allowedPasswords[0].code2,allowedPasswords[0].etherAmount);
      });

      beforeEach('should deploy Remittance instance', async () => {
        const latestBlock = await getBlock('latest');
        const maxFarInTheFuture = latestBlock.timestamp + duration.years(1);

        remittanceInstance = await Remittance.new(maxFarInTheFuture,
            {from: alice}).should.be.fulfilled;
      });

      describe('#otp()', () => {
        describe('allowed', () => {
          allowedPasswords.forEach((values) => {
            it(`to use code1= ${values.code1} and code2= ${values.code2}`, async () => {
              const otp1 = await remittanceInstance.otp(values.code1, values.code2, values.etherAmount,
                  {from: alice});

              otp1.should.be.equal(soliditySha3(values.code1, values.code2, values.etherAmount));
            });
          });
        });

        describe('fail', () => {
          it('if called with code1 null ', async () => {
            await web3.eth.expectedExceptionPromise(() => {
              return remittanceInstance.otp(fromAscii(''), allowedPasswords[0].code2, allowedPasswords[0].etherAmount,
                  {from: alice});
            }, MAX_GAS);
          });

          it('if called with code2 null ', async () => {
            await web3.eth.expectedExceptionPromise(() => {
              return remittanceInstance.otp(allowedPasswords[0].code1, fromAscii(''), allowedPasswords[0].etherAmount,
                  {from: alice});
            }, MAX_GAS);
          });
        });
      });

      describe('#depositFund()', () => {
        describe('allowed', () => {
          it('if called with valid codes and amount ', async () => {
            const latestBlock = await getBlock('latest');
            const deadline = latestBlock.timestamp + duration.hours(1);

            const result = await remittanceInstance.depositFund(password, deadline,
                {from: alice, value: allowedPasswords[0].etherAmount, gas: MAX_GAS});

            result.logs[0].event.should.be.equal('EventDepositFund');
            result.logs[0].args.caller.should.be.equal(alice);
            result.logs[0].args.password.should.be.equal(soliditySha3(allowedPasswords[0].code1, allowedPasswords[0].code2, allowedPasswords[0].etherAmount));
            result.logs[0].args.deadline.should.be.eq.BN(deadline);
            result.logs[0].args.etherAmount.should.be.eq.BN(allowedPasswords[0].etherAmount);
          });

          it('if deposited from any user ', async () => {
            const latestBlock = await getBlock('latest');
            const deadline = latestBlock.timestamp + duration.hours(1);
            const result = await remittanceInstance.depositFund(password, deadline,
                {from: david, value: allowedPasswords[0].etherAmount, gas: MAX_GAS});

            result.logs[0].event.should.be.equal('EventDepositFund');
            result.logs[0].args.caller.should.be.equal(david);
            result.logs[0].args.password.should.be.equal(soliditySha3(allowedPasswords[0].code1, allowedPasswords[0].code2, allowedPasswords[0].etherAmount));
            result.logs[0].args.deadline.should.be.eq.BN(deadline);
            result.logs[0].args.etherAmount.should.be.eq.BN(allowedPasswords[0].etherAmount);
          });
        });

        describe('fail', () => {
          it('if called with invalid deadline ', async () => {
            const latestBlock = await getBlock('latest');
            const deadlines = [latestBlock.timestamp - 10, latestBlock.timestamp + duration.years(2)];

            deadlines.forEach(async (deadline) => {
              await web3.eth.expectedExceptionPromise(() => {
                return remittanceInstance.depositFund(password, deadline,
                    {from: alice, value: allowedPasswords[0].etherAmount, gas: MAX_GAS});
              }, MAX_GAS);
            });
          });

          it.skip('if called with sender = address(0)', async () => {
            const latestBlock = await getBlock('latest');
            const deadline = latestBlock.timestamp + duration.minutes(2);

            await web3.eth.expectedExceptionPromise(() => {
              return remittanceInstance.depositFund(password, deadline,
                  {from: ZERO_ADDRESS, value: allowedPasswords[0].etherAmount, gas: MAX_GAS});
            }, MAX_GAS);
          });

          it('if called with amount = 0', async () => {
            const latestBlock = await getBlock('latest');
            const deadline = latestBlock.timestamp + duration.minutes(2);

            await web3.eth.expectedExceptionPromise(() => {
              return remittanceInstance.depositFund(password, deadline,
                  {from: alice, value: 0, gas: MAX_GAS});
            }, MAX_GAS);
          });

          it('if called with password already deposited', async () => {
            const latestBlock = await getBlock('latest');
            const deadline = latestBlock.timestamp + duration.minutes(2);

            await remittanceInstance.depositFund(password, deadline,
                {from: alice, value: allowedPasswords[1].etherAmount, gas: MAX_GAS})
                .should.be.fulfilled;

            await web3.eth.expectedExceptionPromise(() => {
              return remittanceInstance.depositFund(password, deadline,
                  {from: alice, value: 0, gas: MAX_GAS});
            }, MAX_GAS);
          });
        });
      });

      describe('#withdrawFund()', () => {
        describe('allowed', () => {
          beforeEach('should deposit fund', async () => {
            const latestBlock = await getBlock('latest');
            const deadline = latestBlock.timestamp + duration.hours(1);
            await remittanceInstance.depositFund(password, deadline,
                {from: alice, value: allowedPasswords[0].etherAmount, gas: MAX_GAS})
                .should.be.fulfilled;
          });

          it('if called in time with valid data and emit Event ', async () => {
            const result = await remittanceInstance.withdrawFund(allowedPasswords[0].code1, allowedPasswords[0].code2, allowedPasswords[0].etherAmount,
                {from: carol});

            result.logs[0].event.should.be.equal('EventWithdrawFund');
            result.logs[0].args.caller.should.be.equal(carol);
            result.logs[0].args.payer.should.be.equal(alice);
            result.logs[0].args.etherAmount.should.be.eq.BN(allowedPasswords[0].etherAmount);
          });

          it('if called in time and caller receive amount ', async () => {
            const preCarolBalance = new BN(await getBalance(carol));

            const result = await remittanceInstance.withdrawFund(allowedPasswords[0].code1, allowedPasswords[0].code2, allowedPasswords[0].etherAmount,
                {from: carol}).should.be.fulfilled;

            const gasUsedWithdrawFunds = new BN(result.receipt.gasUsed);
            const txObj = await getTransaction(result.tx);
            const gasPriceWithdrawFunds = new BN(txObj.gasPrice);
            const totalGas = gasPriceWithdrawFunds.mul(gasUsedWithdrawFunds);
            const postCarolBalance = new BN(await getBalance(carol));

            postCarolBalance.should.be.eq.BN((preCarolBalance.add(new BN(allowedPasswords[0].etherAmount))).sub(totalGas));
          });
        });

        describe('fail', () => {
          beforeEach('before deposit fund', async () => {
            const latestBlock = await getBlock('latest');
            const deadline = latestBlock.timestamp + duration.seconds(10);
            await remittanceInstance.depositFund(password, deadline,
                {from: alice, value: allowedPasswords[0].etherAmount, gas: MAX_GAS})
                .should.be.fulfilled;
          });

          it('if called not in time', async () => {
            await web3.evm.increaseTime(duration.seconds(15));
            await web3.eth.expectedExceptionPromise(() => {
              return remittanceInstance.withdrawFund(allowedPasswords[0].code1, allowedPasswords[0].code2, allowedPasswords[0].etherAmount,
                  {from: carol});
            }, MAX_GAS);
          });

          it('if called with invalid password', async () => {
            await web3.eth.expectedExceptionPromise(() => {
              return remittanceInstance.withdrawFund(allowedPasswords[0].code2, allowedPasswords[0].code1, allowedPasswords[0].etherAmount,
                  {from: carol});
            }, MAX_GAS);
          });

          it('if called from payer', async () => {
            await web3.eth.expectedExceptionPromise(() => {
              return remittanceInstanceOne.withdrawFund(allowedPasswords[0].code1, allowedPasswords[0].code2, allowedPasswords[0].etherAmount,
                  {from: alice});
            }, MAX_GAS);
          });
        });
      });

      describe('#claimFund()', () => {
      });

      describe('#kill()', () => {
        describe('allowed', () => {
          beforeEach('should deposit fund', async () => {
            const latestBlock = await getBlock('latest');
            const deadline = latestBlock.timestamp + duration.hours(1);
            await remittanceInstance.depositFund(password, deadline,
                {from: alice, value: allowedPasswords[0].etherAmount, gas: MAX_GAS})
                .should.be.fulfilled;
          });

          it('if called from owner', async () => {
            let result = await remittanceInstance.kill({from:alice});

            result.logs[0].event.should.be.equal('EventKilled');
            result.logs[0].args.caller.should.be.equal(alice);
            result.logs[0].args.balance.should.be.eq.BN(allowedPasswords[0].etherAmount);
          });

          it('from owner that receive the balance', async () => {

            const preBalance = new BN(await getBalance(alice));

            let result = await remittanceInstance.kill({from:alice});

            const gasUsedWithdrawFunds = new BN(result.receipt.gasUsed);
            const txObj = await getTransaction(result.tx);
            const gasPriceWithdrawFunds = new BN(txObj.gasPrice);
            const totalGas = gasPriceWithdrawFunds.mul(gasUsedWithdrawFunds);
            const postBalance = new BN(await getBalance(alice));
            postBalance.should.be.eq.BN((preBalance.add(new BN(allowedPasswords[0].etherAmount))).sub(totalGas));
          });          
        });

        describe('fail', () => {
          it('if called from non owner', async () => {
            await web3.eth.expectedExceptionPromise(() => {
              return remittanceInstance.kill({from: carol, gas: MAX_GAS});
            }, MAX_GAS);            
          });
        });
      });
    });
  });
});
