// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MultiSigWallet {
    event Deposit(address indexed sender, uint amount, uint newBalance);
    event SubmitTransaction(
        address indexed owner,
        uint indexed txId,
        address indexed to,
        uint value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint indexed txId);
    event RevokeConfirmation(address indexed owner, uint indexed txId);
    event ExecuteTransaction(address indexed owner, uint indexed txId);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public required;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;
    }

    Transaction[] public transactions;

    mapping(uint => mapping(address => bool)) public hasConfirmed;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "caller is not an owner");
        _;
    }

    modifier txExists(uint _txId) {
        require(_txId < transactions.length, "transaction does not exist");
        _;
    }

    modifier notExecuted(uint _txId) {
        require(!transactions[_txId].executed, "transaction already executed");
        _;
    }

    modifier notConfirmed(uint _txId) {
        require(!hasConfirmed[_txId][msg.sender], "transaction already confirmed");
        _;
    }

    constructor(address[] memory _owners, uint _required) {
        require(_owners.length > 0, "owners list is empty");
        require(
            _required >= 1 && _required <= _owners.length,
            "invalid number of required confirmations"
        );

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "owner is the zero address");
            require(!isOwner[owner], "duplicate owner");

            isOwner[owner] = true;
            owners.push(owner);
        }

        required = _required;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function submitTransaction(
        address _to,
        uint _value,
        bytes memory _data
    ) external onlyOwner {
        uint txId = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txId, _to, _value, _data);
    }

    function confirmTransaction(uint _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        notConfirmed(_txId)
    {
        Transaction storage transaction = transactions[_txId];
        transaction.numConfirmations += 1;
        hasConfirmed[_txId][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txId);
    }

    function executeTransaction(uint _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
    {
        Transaction storage transaction = transactions[_txId];

        require(
            transaction.numConfirmations >= required,
            "not enough confirmations"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "transaction execution failed");

        emit ExecuteTransaction(msg.sender, _txId);
    }

    function revokeConfirmation(uint _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
    {
        require(hasConfirmed[_txId][msg.sender], "transaction not confirmed");

        Transaction storage transaction = transactions[_txId];
        transaction.numConfirmations -= 1;
        hasConfirmed[_txId][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txId);
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() external view returns (uint) {
        return transactions.length;
    }
}
