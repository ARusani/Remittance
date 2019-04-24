pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Killable.sol";


contract Remittance is Killable {
    using SafeMath for uint256;

    event EventRemittanceCreated(
        address indexed caller,
        uint256 maxFarInTheFuture
    );

    event EventDepositFund(
        address indexed caller,
        bytes32 password,
        uint256 deadline,
        uint256 etherAmount
    );

    event EventClaimFund(
        address indexed caller,
        bytes32 password,
        uint256 etherDrop
    );

    event EventWithdrawFund(
        address indexed caller,
        address indexed payer,
        uint256 etherAmount
    );

    uint256 public maxFarInTheFuture;


    struct Fund {
        address sender;
        uint256 etherAmount;
        uint256 deadline;
    }

    mapping(bytes32 => Fund) public funds;

    constructor (uint256 _maxFarInTheFuture) public {
        require(_maxFarInTheFuture > now, "Max time in the future shall be > now");

        maxFarInTheFuture = _maxFarInTheFuture;
        emit EventRemittanceCreated(msg.sender, maxFarInTheFuture);
    }

    function otp(bytes32 _code1, bytes32 _code2, uint256 _etherAmount) public pure returns(bytes32 password) {
        require(_code1 != 0, "First code is null");
        require(_code2 != 0, "Second code is null");
        require(_etherAmount != 0, "Ethers amount can not be zero");
        return keccak256(abi.encodePacked(_code1, _code2,_etherAmount));
    }

    function depositFund(bytes32 _password, uint256 _deadline) public payable {
        require(now < _deadline && _deadline < maxFarInTheFuture, "deadline is not valid");
        uint256 etherAmount = msg.value; 
        require(etherAmount != 0, "Funds deposited is zero");

        Fund storage fund = funds[_password];
        require (fund.sender == address(0), "Fund already deposited");

        fund.sender = msg.sender;
        fund.etherAmount = etherAmount;
        fund.deadline = _deadline;

        emit EventDepositFund(msg.sender, _password, _deadline, etherAmount);
    }

    function withdrawFund(bytes32 _code1, bytes32 _code2,uint256 _etherAmount) public {
        bytes32 password = otp(_code1,_code2,_etherAmount);
        Fund storage fund = funds[password];

        uint256 etherAmount = fund.etherAmount;
        address payer = fund.sender;
        
        require(payer != address(0), "Deposit not exist");
        require(now <= fund.deadline, "Time greater than limit");
        require(msg.sender != payer, "Deposer can not withdraw");

        fund.sender = address(0);
        fund.etherAmount = 0;
        fund.deadline = 0;

        emit EventWithdrawFund(msg.sender, payer, etherAmount);

        msg.sender.transfer(etherAmount);
    }

    function claimFund(bytes32 _code1, bytes32 _code2,uint256 _etherAmount) public {
        bytes32 password = otp(_code1,_code2,_etherAmount);
        Fund storage fund = funds[password];
        require(fund.sender != address(0), "Fund does not exist");
        require(msg.sender == fund.sender, "Invalid Claimer");
        require(now > fund.deadline, "Too early for claim");

        uint256 etherDrop = fund.etherAmount;
        fund.sender = address(0);
        fund.etherAmount = 0;
        fund.deadline = 0;

        emit EventClaimFund(msg.sender, password, etherDrop);
        msg.sender.transfer(etherDrop);
    }
}
