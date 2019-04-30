pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Stoppable is Ownable {

    event EventStopped(address indexed caller);
    event EventRun(address indexed caller);
    event EventContractKilled(address indexed caller, uint256 balance);

    bool private stopped;

    modifier onlyRunning() {
        require(!stopped, "Contract is in stopped state");
        _;
    }

    modifier onlyStopped() {
        require(stopped, "Contract is not in stopped state");
        _;
    }

    constructor (bool _asStopped) internal {
        stopped = _asStopped;
    }

    function stop() public onlyOwner onlyRunning  {
        stopped = true;

        emit EventStopped(msg.sender);
    }

    function run() public onlyOwner onlyStopped {
        stopped = false;
        emit EventRun(msg.sender);
    }

    function isStopped() public view returns (bool) {
        return stopped;
    }

    function kill() public onlyOwner onlyStopped {
        emit EventContractKilled(msg.sender, address(this).balance);
        selfdestruct(msg.sender);
    }
}