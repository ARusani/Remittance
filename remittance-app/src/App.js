import React from 'react';
import './App.css';
import truffleContract from 'truffle-contract';
import remittanceJson from '../../node_modules/remittance-contracts/build/contracts/Remittance.json';
import Web3 from 'web3';

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      web3: null, 
      accounts: null, 
      contract: null 
    }
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = new Web3(Web3.givenProvider || new Web3.providers.HttpProvider('http://localhost:9545'));
      console.log(web3)

      web3.eth.getTransactionReceiptMined = require('../../node_modules/remittance-contracts/gistLepretre/getTransactionReceiptMined.js');
      
      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      console.log('accounts[0]=',accounts[0]);

      const remittanceContract = truffleContract(remittanceJson);
      remittanceContract.setProvider(web3.currentProvider);
     
       if (typeof remittanceContract.currentProvider.sendAsync !== "function") {
        remittanceContract.currentProvider.sendAsync = function() {
            return remittanceContract.currentProvider.send.apply(
              remittanceContract.currentProvider, arguments
            );
        };
      }; 

      const instance = await remittanceContract.deployed();
      console.log(instance);

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3: web3, accounts: accounts, contract: instance });
      this.addEventListener(this);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.log(error);
    }
  };

  otp = async (event) => {
     try {
        const { web3, accounts, contract } = this.state;
        const {toWei, sha3} = web3.utils;

        const result = await contract.otp(sha3(event.target.Password1.value), sha3(event.target.Password2.value), toWei(event.target.etherAmount.value), { from: accounts[0] });
        console.log("set receipt status", result.receipt.status);
        if (parseInt(result.receipt.status) !== 1) {
          throw new Error("Failed to set value");
      }
    } catch(error) {
      console.log(error);
    } 
  };

  addEventListener = async (component) => {
    const eventDepositFund = this.state.contract.EventDepositFund({}, { fromBlock: 0, toBlock: 'latest' });
    eventDepositFund.watch(function(err, result) {
      if (err) {
        console.log(err);
        return;
      }
      console.log("EventDepositFund received, value: " + result.args.etherAmount.toString(10));
    })
  };  

  render(){
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }    
    return (
      <div className="App">
        <header className="App-header">
        <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Remittance</h1>
        <span id="insTrans"></span>
        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>OTP</h2>
        <form onSubmit={this.otp.bind(this)}>
          <label>Password1:</label>
          <input type="text" name="Password1" />
          <label>Password2:</label>
          <input type="text" name="Password2" />
          <label>Ethers Amount:</label>
          <input type="text" name="etherAmount" />
          <button type="submit">Generate</button>
        </form>  
        </header>
      </div>
    )
  }
}

export default App;