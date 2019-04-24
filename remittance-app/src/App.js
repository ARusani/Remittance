import React from 'react';
import './App.css';
import { default as contract } from 'truffle-contract';
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
      const web3 = await this.injectWeb3();
      console.log(web3)

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      console.log('accounts[0]=',accounts[0]);
      this.setState({ account: accounts[0] });

      const remittanceContract = contract(remittanceJson);
      remittanceContract.setProvider(web3.currentProvider);
      if (typeof remittanceContract.currentProvider.sendAsync !== "function") {
/*         remittanceContract.currentProvider.sendAsync = () => {
            return remittanceContract.currentProvider.send.apply(
              remittanceContract.currentProvide
            );
        }; */
      }
      const instance = await remittanceContract.deployed();

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3: web3, contract: instance });
      this.addEventListener(this);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.log(error);
    }
  };

  injectWeb3 = async () => {
    return new Promise((resolve, reject) => {
      window.addEventListener("load", async () => {
        // Modern dapp browsers...
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum);
          try {
            // Request account access if needed
            await window.ethereum.enable();
            resolve(web3);
          } catch (error) {
            // User denied account access...
            console.log(error);
            reject(error);
          }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
          // Use Mist/MetaMask's provider.
          const web3 = window.web3;
          console.log("Injected web3 detected.");
          resolve(web3);
        }
        // Fallback to localhost;
        else {
          const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545')); 
          console.log("No web3 instance injected, using Local web3.");
          resolve(web3);
        }
      });
    });
  };

  depositFund = async(val) => {
/*     try {
      const { accounts, contract } = this.state;
      const result = await contract.set(val, { from: accounts[0] });
      console.log("set receipt status", result.receipt.status);
      if (parseInt(result.receipt.status) !== 1) {
        throw new Error("Failed to set value");
      }
      // this.setState({ storageValue: result.logs[0].args.value.toString(10)});
      // We skip using the event here because we add a listener.
    } catch(error) {
      alert(`Failed to set value to $val`);
      console.log(error);
    } */
  };

  addEventListener(component) {
    const updateEvent = this.state.contract.EventDepositFund({}, { fromBlock: 0, toBlock: 'latest' });
    updateEvent.watch(function(err, result) {
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
          <form>
            <label>
              Password1:
              <input type="text" name="Password1" />
            </label>
            <label>
              Password2:
              <input type="text" name="Password2" />
            </label>
          </form>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Deposit</h2>                      
          <form>
            <label>
              Password:
              <input type="text" name="Password" />
            </label>
            <label>
              Ether to send: 
              <input type="text" name="etherAmount" />
            </label>
            <input type="Deposit" value="Submit" onClick={ () => this.depositFund(2) }/>
          </form>
        </header>
      </div>
    )
  }
}

export default App;