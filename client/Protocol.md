

# SQLiteNode server protocol

> # TODO: Changes before further development:
>
> - One users file
> - User has full access to all databases
> - Global lock - first transaction locks access to all databases
> - Cannot promote read-only lock to write lock - it would cause deadlocks,
> - No automatic logging of write queries, application must do it on its own
>   (may have logging of errors, warnings, and other events, but without database content).
> - Ability to access multiple databases in one connection or transaction.
> - Write lock completely cuts out other connections from accessing the database,
>   so it can be used even for managing databases on file level, e.g. for password change.
> - Write lock also locks users file.
> - All databases share the same password. If admin changes the password it will be changed for all databases.
> - Since changing password is a heavy operation and critical, it should be done by copying all databases
>   to new temp directory, changing password there, and then renaming directories (everything in single write lock).
> - The password change operation may send progress updates (to investigate how fast change password operation is).
> - The password change operation may interrupt to allow server to handle other requests.
> - When inside transaction, client must do operations continuously. If there is a long pause,
>   connection is closed and transaction is rolled back. This is to prevent locking the database for too long.
>   Because of that, client application cannot block on user input while inside transaction.
> - Server should send BUSY response periodically while client is waiting for transaction.
> - Database password should be encrypted with AES-128-GCM to verify its correctness before
>   trying to open the database file with it.


## Access control

Access control is based on user user name and password or certificate.

Once user is authenticated, it has full access to the database.
There is no concept of read-only users or users with limited access.

Each user record has encrypted global password to open the SQLite file, without valid user credentials or global password the database file is not accessible.

Only special user is `admin` which is allowed to manage users and reset their passwords.
He can also change global password.

There is no global admin for all databases. Databases are managed locally.

## Logging

### Write requests logging

All write requests are logged to an encrypted SQLite database files.
One log file for specific period of time, for example one month, is created.

Each entry contains:
- timestamp
- transaction id
- query string
- query parameters
- query result: success or error, last affected row id if available
- comment

Entries are grouped within a transaction. Only write transactions are logged.
Transaction can be rolled back, in that case, transaction is marked as rolled back. 

Each transaction contains:
- transaction id
- parent transaction id if available
- timestamp of start and end of transaction
- user name
- connection information: client IP address, connection id, etc.

There is one pseudo-transaction global for each successful connection.

### User activity logging

Application can log text-based logs. If they are in context of a transaction, they are associated with the transaction id.
Server events can also be logged, e.g. unexpected disconnection.

User activity logs contains:
- timestamp
- transaction id (connection pseudo-transaction if not in context of a transaction)
- log source: application, server
- log level: info, warning, error
- log message

## File structure

The server has the following file structure:
- `<database_name>.sqlite` - encrypted SQLite database file
- `<database_name>.user` - users file, plaintext SQLite database with user records with encrypted global password
- `<database_name>.log` - directory with log files
  - `<log_period_date>.sqlite` - encrypted SQLite database file with logs for specific period of time


## Connection

Client connects to the server using TCP socket.

First stage of connection is authentication. Client must provide database name, user name and authentication credentials.

Once user is authenticated, client can open transaction and execute queries.
All queries must by executed within a transaction. Transaction can be nested.

If client causes a fatal error, e.g. incorrect transaction state, server sends appropriate error result and gracefully closes the connection.

If connection is closed unexpectedly, all active transactions are rolled back and appropriate log entry is created.

Client must provide heartbeat command to keep the connection alive. If heartbeat is not received within a certain timeout, connection is closed and all active transactions are rolled back.

## Encryption

All communication is encrypted with AES-128-CCM. Initially, during authentication, zero key is used for the first two messages. After that, encryption key is derived from the client and server ephemeral keys, salts, and user credentials with ECDH and KDF.

AES-128-CCM parameters:
- key length: 16 bytes (128 bits)
- nonce length: 8 bytes (64 bits)
- tag length: 12 bytes (96 bits)

Nonce starts from 0 for messages from client to server, and from `(1uLL << 63)` for messages from server to client, and is incremented by 1 for each subsequent message in the same direction. In is not transmitted.

Associated data for the AES-128-CCM is the message length (as 32-bit little-endian integer).

Frame format:
- uint32 begin_marker; // fixed value to identify the beginning of a message
- uint32 length; // length of entire message including header, body and tag
- byte[length - 20] encrypted_body; // encrypted message body, structure depends on the message type
- byte[12] tag; // authentication tag

encrypted_body:
- uint16 type; // type of the command, e.g. authentication, query, transaction
- uint16 flags;
- byte[] body; // command body, structure depends on the command type


## Authentication

```
Client -> Server:
    type = 0 // connect
    byte[] client_ephemeral_public_key; // random value generated on program start
    byte[] client_salt; // random value generated for each connection
    String database_name;
    String user_name;

Server -> Client:
    type = 1 // server authentication
    byte[] server_ephemeral_public_key; // random value generated on program start
    byte[] server_salt; // random value generated for each connection
    byte[] user_salt; // random salt stored in user record

From this point, all messages are encrypted with AES-128-CCM using key:
    key = KDF(
        ECDH(client_ephemeral_private_key, server_ephemeral_public_key) +
        client_salt +
        server_salt +
        KDF(user_salt, user_name, user_password, "CCM") // this is stored in user record
        )

Nonces are not reset after authentication.

Client creates key to decrypt private key for decrypting database password:
    user_private_key_decrypt_key = KDF(user_salt, user_name, user_password, "DBPWD")

Client -> Server:
    type = 2 // client authentication
    byte[] user_private_key_decrypt_key;

Server -> Client:
    type = 3 // authentication success
    // no body

```

## Commands

After authentication, connection is used to send commands and responses.
Commands are sent by the client to server, executed synchronously, and server sends one or more responses back to the client.

General command structure:

```
uint32 id; // unique command id for correlation
uint32 type; // type of the command, e.g. authentication, query, transaction
uint32 flags; // unused for now
byte[] body; // command body, structure depends on the command type
```

General response structure:

```
uint32 id; // command id from the request for correlation
int32 type; // type of the response, or negative error code
uint32 flags; // one flag bit set to indicate that more responses will follow
byte[] body; // response body, structure depends on the response type
```

One special response type: empty response - used at the end of a series of responses to indicate that there are no more responses to follow.

```
type: 0 // empty response
body: none
```

### Query command

Do SQL query and return results.

**Command**

```
type: 1
body:
  uint32 flags; // query flags:
                // 1. cache prepared statement (cache contains only statement in reset state, not the ones that are currently being executed)
                // 2. close statement after responses are sent even if there are more rows to fetch.
                // 3. do not log this query even if it is a write query. If not set, write queries are logged.
                //    read queries are never logged.
  uint32 maximum_number_of_response_rows;
  uint32 transaction_id; // If transaction_id is not top-most transaction, error is returned and all nested transactions are rolled back.
  string query; // SQL query string
  Parameter[] parameters; // query parameters, if any
  string comment; // optional comment for logging
```

**Responses**

```
type: 1 // Query result
body:
  uint64 last_row_id; // last affected row id
  uint32 statement_id; // contains the statement id for subsequent continue command, required if result is partial
  Column[] columns; // column metadata, e.g. name, type, etc.
  bool more_rows_follows; // flag to indicate that there are more rows to follow (in the result, not necessarily in this response)

type: 2 // Row (zero or more responses)
body:
  Value[] values; // column values for the row
  bool more_rows_follows; // flag to indicate that there are more rows to follow (in the result, not necessarily in this response)
```

### Continue command

If not all rows could be sent in previous response, continue to receive more rows.

To just close the statement set the appropriate flag and set maximum_number_of_response_rows to 0.

**Command**

```
type: 2
body:
  uint32 flags; // flags:
                // close statement after responses are sent even if there are more rows to fetch.
  uint32 statement_id;
  uint32 maximum_number_of_response_rows;
```

**Responses**

Command responses with one or more "Row" responses.
If there is no more rows to send, sends empty response.

### Begin transaction command

Begin transaction. If there is already an active transaction, begin nested transaction.

**Command**

```
type: 3
body:
    bool write; // true for write transaction, false for read-only transaction
                // If we are creating "write" transaction we need to wait for all other connections to finish their active transactions.
                // If we are creating "read-only" transaction we need to wait for all active "write" transactions to finish.
    uint32 timeout;
    string comment; // optional comment for logging
```

**Response**

```
type: 3
body:
    uint32 transaction_id; // transaction id for subsequent commands
```

BUSY error is returned if timeout expires and there is already an active transaction that prevents starting a new transaction.
Client can wait and retry after some time.

### End transaction command

End transaction. If there is an active nested transaction, end the most recent one.

**Command**

```
type: 4
body:
    uint32 transaction_id; // transaction id for the transaction to end, must be the same as the most recent active transaction id
                           // if not, this transaction and all nested transactions are rolled back, error is returned.
    bool commit; // true to commit, false to roll back
```

**Response**

Empty response if there are no errors.

### Log command

Log user activity.

**Command**

```
type: 5
body:
    uint32 transaction_id; // transaction id for the log entry, or -1 if not related to any transaction
    uint32 log_level; // log level: info, warning, error
    string message; // log message
```

**Response**

Empty response if there are no errors.

### Change password command

```
type: 6
body:
    byte[] user_name; // name different than current user name is allowed only for admins
    byte[] user_salt;
    byte[] password_hash; // == KDF(user_salt, user_name, user_password, "CCM")
    byte[] user_private_key = SECP256_KEY_DERIVER(KDF(user_salt, user_name, user_password, "DBPWDPRV"))
    byte[] admin_public_key = ecc_derive_public_key(SECP256_KEY_DERIVER(KDF(user_salt, user_name, user_password, "ADMIN"))) // only for admins
```

TODO: Instead of SECP256_KEY_DERIVER, create symmetric keys with KDF from user password, encrypt private keys with them and store encrypted keys in user record.
This way ECC keys will be generated in standard way.

Changes to user record:
- user name: unchanged
- user salt: user_salt
- password hash: password_hash
- user public key: ecc_derive_public_key(user_private_key)
- database password: AES-???(
        data=database_password,
        key=KDF(ECDH(user_private_key, admin_public_key), "DBPWD")
    )
- is admin: unchanged
- is used to encrypt database password: unchanged
- admin public key: admin_public_key

If admin public key of updated user is used to encrypt database password, update each user record with new encrypted database password.

### Backup command

TODO: do copy of the database file, and send it to the client in chunks.

Optionally, backup also logs.

Sending entire users file may be security risk, so instead, user files with password_hash
(`"KDF(user_salt, user_name, user_password, "CCM")"`) removed. This way, restoring database will be possible,
but all user's passwords will need to be reset.

### Admin commands

TODO:
- list users: returns user name, and if it is admin
- add user: name, password, is_admin
- delete user: name
- change user password: name, new password
- change database password: new database password, disconnect existing connections

