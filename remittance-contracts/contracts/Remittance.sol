pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Stoppable.sol";


contract Remittance is Stoppable {
    using SafeMath for uint256;

    event EventRemittanceCreated(
        address indexed caller,
        uint256 maxFarInTheFuture
    );

    event EventDepositFund(
        address indexed caller,
        bytes32 indexed keyCode,
        uint256 releaseTime,
        uint256 etherAmount
    );

    event EventCancelRemittance(
        address indexed caller,
        bytes32 indexed keyCode,
        uint256 etherDrop
    );

    event EventWithdrawRemittance(
        address indexed caller,
        bytes32 indexed keyCode,
        uint256 etherAmount
    );

    /* limit to how far in the future the deadline can be, in seconds */
    uint256 public maxFarInTheFuture;


    struct Fund {
        address sender;
        uint256 etherAmount;
        uint256 releaseTime;
    }

    /* use the hash of the secret codes and beneficiary Address as key of the remittance */
    mapping(bytes32 => Fund) public funds;

    constructor (uint256 _maxFarInTheFuture, bool _asStopped) Stoppable(_asStopped) public {
        require(_maxFarInTheFuture > 0, "Max time in the future shall be > 0");

        maxFarInTheFuture = _maxFarInTheFuture;
        emit EventRemittanceCreated(msg.sender, maxFarInTheFuture);
    }

    /* Generate a unique keyCode that is not possible to reuse deposit */
    function oneTimeKeyCode(bytes32 _code, address _beneficiaryAddress) public view returns(bytes32 keyCode) {
        require(_code != 0, "code is null");
        require(_beneficiaryAddress != address(0), "_beneficiaryAddress is null");
        return keccak256(abi.encodePacked(this, _code, _beneficiaryAddress));
    }

    function depositFund(bytes32 _keyCode, uint256 _deadline) public payable onlyRunning {
        require(0 < _deadline && _deadline < maxFarInTheFuture, "deadline is not valid");

        require(msg.value != 0, "Funds deposited is zero");

        Fund storage fund = funds[_keyCode];
        require (fund.sender == address(0), "_keyCode already used");

        uint256 releaseTime = now.add(_deadline);
        fund.sender = msg.sender;
        fund.etherAmount = msg.value;
        fund.releaseTime = releaseTime;

        emit EventDepositFund(msg.sender, _keyCode, releaseTime,  msg.value);
    }

    function withdrawRemittance(bytes32 _code) public onlyRunning {
        bytes32 keyCode = oneTimeKeyCode(_code,msg.sender);
        Fund storage fund = funds[keyCode];
        uint256 etherAmount = fund.etherAmount;
        require(fund.etherAmount != 0, "Fund does not exist");

        fund.etherAmount = 0;
        fund.releaseTime = 0;

        emit EventWithdrawRemittance(msg.sender, keyCode, etherAmount);

        msg.sender.transfer(etherAmount);
    }

    function cancelRemittance(bytes32 _keyCode) public onlyRunning {
        Fund storage fund = funds[_keyCode];
        uint256 etherDrop = fund.etherAmount;
        require(etherDrop != 0, "Fund does not exist");
        require(msg.sender == fund.sender, "Invalid Claimer");
        require(now > fund.releaseTime, "Too early for claim");

        fund.etherAmount = 0;
        fund.releaseTime = 0;

        emit EventCancelRemittance(msg.sender, _keyCode, etherDrop);
        msg.sender.transfer(etherDrop);
    }
}
