pragma solidity ^0.5.0;


import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Killable is Ownable {
    event EventKilled(address indexed caller, uint256 balance);
    function kill() public onlyOwner {
        emit EventKilled(msg.sender, address(this).balance);
        selfdestruct(msg.sender);
    }
}