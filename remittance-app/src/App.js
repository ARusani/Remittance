/* eslint-disable require-jsdoc */
import React from 'react';
import './App.css';
import truffleContract from 'truffle-contract';
import remittanceJson from '../../node_modules/remittance-contracts/build/contracts/Remittance.json';
import Web3 from 'web3';
import logo from './B9LabEthereum.png';
import loader from './Loading_icon.gif';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      web3: null,
      accounts: null,
      instance: null,
      exchangeAddress: 'not selected',
      payerAddress: 'not selected',
      event: '',
      showLoader: false,
    };
    this.handleAddressChange = this.handleAddressChange.bind(this);
    this.addEventListener = this.addEventListener.bind(this);
    this.deposit = this.deposit.bind(this);
    this.withdraw = this.withdraw.bind(this);
    this.cancelRemittance = this.cancelRemittance.bind(this);
  };

  async componentDidMount() {
    try {
      // Get network provider and web3 instance.
      const web3 = new Web3(Web3.givenProvider || new Web3.providers.HttpProvider('http://localhost:9545'));
      console.log(web3.version);

      const accounts = await web3.eth.getAccounts();

      const remittanceContract = truffleContract(remittanceJson);
      remittanceContract.setProvider(web3.currentProvider);

      if (typeof remittanceContract.currentProvider.sendAsync !== 'function') {
        remittanceContract.currentProvider.sendAsync = function() {
          return remittanceContract.currentProvider.send.apply(
              remittanceContract.currentProvider, arguments
          );
        };
      };

      const instance = await remittanceContract.deployed();

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({web3: web3, accounts: accounts, instance: instance, payerAddress: accounts[0]});
      this.addEventListener(this);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
          `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.log(error);
    }
  };

  async handleAddressChange(event) {
    const {value} = event.target;
    this.setState({'exchangeAddress': value});
  };

  async deposit(event) {
    event.preventDefault();
    try {
      const {web3, instance, exchangeAddress, payerAddress} = this.state;
      const {fromAscii, toWei} = web3.utils;

      const code = fromAscii(event.target.password.value).padEnd(66, '0');
      const deadline = event.target.deadline.value;
      const etherAmount = toWei(event.target.etherAmount.value, 'ether');

      this.setState({showLoader: true});

      console.log(instance);
      const codeHash = await instance.oneTimePassword.call(code, exchangeAddress,
          {from: payerAddress});
      console.log('code: ', codeHash);
      console.log('exchangeAddress: ', exchangeAddress);

      await instance.depositFund.call('0', deadline,
          {from: payerAddress, value: etherAmount});

      const result = await instance.depositFund(codeHash, deadline,
          {from: payerAddress, value: etherAmount});

      console.log('set receipt status', result.receipt.status);
      if (parseInt(result.receipt.status) !== 1) {
        throw new Error('Failed to set depositFund');
      }
    } catch (error) {
      console.log(error);
      this.setState({event: error.toString()});
      this.setState({showLoader: false});
    }
  };

  async withdraw(event) {
    event.preventDefault();
    try {
      const {web3, instance, exchangeAddress} = this.state;
      const {fromAscii} = web3.utils;

      const code = fromAscii(event.target.password.value).padEnd(66, '0');

      console.log('code: ', code);
      console.log('exchangeAddress: ', exchangeAddress);

      this.setState({showLoader: true});

      await instance.withdrawRemittance.call(code,
          {from: exchangeAddress});

      const result = await instance.withdrawRemittance(code,
          {from: exchangeAddress});

      console.log('set receipt status', result.receipt.status);
      if (parseInt(result.receipt.status) !== 1) {
        throw new Error('Failed to set depositFund');
      }
    } catch (error) {
      console.log(error);
      this.setState({event: error.toString()});
      this.setState({showLoader: false});
    }
  };

  async cancelRemittance(event) {
    event.preventDefault();
    try {
      const {web3, instance, exchangeAddress, payerAddress} = this.state;
      const {fromAscii} = web3.utils;

      const code = fromAscii(event.target.password.value).padEnd(66, '0');

      this.setState({showLoader: true});

      const codeHash = await instance.oneTimePassword.call(code, exchangeAddress,
          {from: payerAddress});

      await instance.cancelRemittance(codeHash,
          {from: payerAddress});
  
      const result = await instance.cancelRemittance(codeHash,
          {from: payerAddress});

      console.log('set receipt status', result.receipt.status);
      if (parseInt(result.receipt.status) !== 1) {
        throw new Error('Failed to set depositFund');
      }
    } catch (error) {
      console.log(error);
      this.setState({event: error.toString()});
      this.setState({showLoader: false});
    }
  };

  async addEventListener(component) {
    const eventDepositFund = this.state.instance.EventDepositFund({},
        {fromBlock: 0, toBlock: 'latest'});
    console.log(eventDepositFund);
    eventDepositFund.watch(function(err, result) {
      component.setState({showLoader: false});

      if (err) {
        console.log(err);
        component.setState({event: err});
        return;
      }
      console.log('EventDepositFund received, value: '
      + result.args.etherAmount.toString(10));
      component.setState({event: result.args.etherAmount.toString(10)});
    });

    const eventWithdrawRemittance = this.state.instance.EventWithdrawRemittance({},
        {fromBlock: 0, toBlock: 'latest'});
    eventWithdrawRemittance.watch(function(err, result) {
      component.setState({showLoader: false});

      if (err) {
        console.log(err);
        return;
      }
      console.log('EventWithdrawRemittance received, value: '
      + result.args.etherAmount.toString(10));
    });

    const eventCancelRemittance = this.state.instance.EventCancelRemittance({},
        {fromBlock: 0, toBlock: 'latest'});
    eventCancelRemittance.watch(function(err, result) {
      component.setState({showLoader: false});
      if (err) {
        console.log(err);
        return;
      }
      console.log('EventCancelRemittance received, value: '
      + result.args.etherDrop.toString(10));
    });
  };

  // eslint-disable-next-line require-jsdoc
  render() {
    if (!this.state.accounts) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="spinner-border fast" role="status" style={{maxWidth: '600px', margin: '100px auto 0 auto'}}>
        <img src={logo} className="logo" alt="logo"/>
        { this.state.showLoader ? <img src={loader} alt="loader"/> : null }
        <h1 style={{fontSize: '32px', marginBottom: '20px'}}>
          Remittance Contract</h1>
        <p>Event result: {this.state.event}</p>
        <hr></hr>
        <h2 style={{fontSize: '20px', marginBottom: '20px'}}>Deposit</h2>
        <form onSubmit={this.deposit} style={{marginBottom: '30px'}}>
          <br></br>
          <input type="password" name="password" placeholder="secret code"/>
          <br></br>
          <input type="deadline" name="deadline" placeholder="deadline"/>
          <br></br>
          <input type="etherAmount" name="etherAmount" placeholder="Ether Amount"/>
          <br></br>
          <select
            value={this.state.exchangeAddress}
            onChange={this.handleAddressChange}
            name="exchangeAddress">
            <option value="">Select Address</option>
            <option value={this.state.accounts[0]}>Alice</option>
            <option value={this.state.accounts[1]}>David</option>
            <option value={this.state.accounts[2]}>Carol</option>
          </select>
          <p>Selected Exchanger Address: "{this.state.exchangeAddress}" </p>
          <br />
          <br />
          <button>Deposit Fund</button>
        </form>
        <hr></hr>
        <h2 style={{fontSize: '20px', marginBottom: '20px'}}>Withdraw</h2>
        <form onSubmit={this.withdraw} style={{marginBottom: '30px'}}>
          <br></br>
          <input type="password" name="password" placeholder="secret code"/>
          <br></br>
          <select
            value={this.state.exchangeAddress}
            onChange={this.handleAddressChange}
            name="exchangeAddress">
            <option value="">Select Address</option>
            <option value={this.state.accounts[0]}>Alice</option>
            <option value={this.state.accounts[1]}>David</option>
            <option value={this.state.accounts[2]}>Carol</option>
          </select>
          <p>Selected Exchanger Address: "{this.state.exchangeAddress}" </p>
          <br />
          <br />
          <button>Withdraw Remittance</button>
        </form>
        <hr></hr>
        <h2 style={{fontSize: '20px', marginBottom: '20px'}}>Cancel Remittance</h2>
        <form onSubmit={this.cancelRemittance} style={{marginBottom: '30px'}}>
          <br></br>
          <input type="password" name="password" placeholder="secret code"/>
          <br></br>
          <select
            value={this.state.payerAddress}
            onChange={this.handleAddressChange}
            name="payerAddress">
            <option value="">Select Address</option>
            <option value={this.state.accounts[0]}>Alice</option>
            <option value={this.state.accounts[1]}>David</option>
            <option value={this.state.accounts[2]}>Carol</option>
          </select>
          <p>Selected Payer Address: "{this.state.payerAddress}" </p>
          <br />
          <br />
          <button>Cancel Remittance</button>
        </form>
        <hr></hr>
      </div>
    );
  }
}

export default App;
