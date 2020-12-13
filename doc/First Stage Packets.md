# First stage packets format

First stage bootloader communication defines four types of packets.

## Catch
Controller sends this packet to *catch* bootloader before it exits.

| Off | Size | Name   | Description          |
|-----|------|--------|----------------------|
| 0   | 1    | Length | Always 14            |
| 1   | 1    | Type   | Always 0 (**catch**) |
| 2   | 12   | Data   | Magic data: 7e3d710b965f11e592562820 |

## Cougth
Device sends this packet to inform that it is *cougth* and waiting for further communication. Additionally,
this packet contains information needed to verify password and start secure connection.

| Enc | Off | Size | Name       | Description                                            |
|-----|-----|------|------------|--------------------------------------------------------|
|     | 0   | 1    | Length     | Always 50                                              |
|     | 1   | 1    | Type       | Always 1 (**cought**)                                  |
|     | 2   | 8    | Salt       | Random salt bytes for device key generation            |
|     | 10  | 12   | IV         | Initialization vector for encryption of remaining data |
| Y   | 22  | 12   | ConnID     | Random Connection ID                                   |
| Y   | 34  | 4    | Counter    | Random initial value of counter                        |
| Y   | 38  | 1    | Flags      | Flags: bit 0 - bootloader is running in safe mode      |
| Y   | 39  | 12   | CheckBytes | Copy of the beginning of the packet                    |

Each device has a unique encryption key generated from user provided *Password* using following method:
```
Salt = 8 random bytes
Key = SHA-256(Salt & Password & "RecoveryBootloaderPassword")
```
*& sign indicates concatenation.*

***Salt*** and *Key* are stored on the device. ***Salt*** is send by this packet allowing controller to generate device *Key* for this connection.

> SECURITY NOTE: ***Salt*** may be used to uniquly indentify the device. Because of that, this protocol cannot be used
> if device needs anonymity. This can be solved by using the same ***Salt*** on every device, but this solution creates the
> same key for each device, so breaking one device allows full access to all devices.

***IV*** field contains last 12 bytes of initialization vector used to encrypt this packet.
First 4 bytes of the initialization vector are taken from the end of ***Salt***

***ConnID***, ***Counter***, ***Flags*** and ***CheckBytes*** are encrypted using DCFB-AES with *IV* and *Key* parameters as described above.

***ConnID*** and ***Counter*** are used later to encrypt **request** and **response**.

***Flags*** byte contain one flag on bit 0 which is set when bootloader is running in safe mode.
Rest of bits are set to zero.

Safe mode is active when partial write of page 0 was done, so it is unknown how much of bootloader
is actually valid. Controller will use only core part of protocol: requests WRITE_BLOCK, GET_STATUS and START_APP.

***CheckBytes*** contains copy of the beginning of the packet (bytes from 0 to 11) before encryption was applyied.

***CheckBytes*** is used to check integrity and to authorize the packet. DCFB-AES has property of error propagation, so if
one encrypted byte was altered then block containing that byte and all following blocks will be altered. Because of that,
if any encrypted byte was altered, key or IV was invalid then ***CheckBytes*** field will be invalid. Additionally,
***CheckBytes*** is a copy of the beginning of the packet, so if unencrypted part of packet was altered then ***CheckBytes***
verification will also fail.

The same method of packet verification is used in the rest of packets types. Unencrypted part of the packet is always
smaller than ***CheckBytes***, so it is always verified by the integrity check.

If number of byte before ***CheckBytes*** is less than ***CheckBytes*** length then they are repeated to fill entire ***CheckBytes***
field, e.g. packet is "Abcde" and after that is ***CheckBytes*** field that contains "AbcdeAbcdeAb"


## Request
Controller requests device to do something.

| Enc | Off | Size | Name       | Description                         |
|-----|-----|------|------------|-------------------------------------|
|     | 0   | 1    | Length     | Total length of the packet          |
|     | 1   | 1    | Type       | Always 2 (**request**)              |
|     | 2   | 2    | LowCounter | Lower 16 bits of counter value      |
| Y   | 4   | N    | Request    | Content of the request              |
| Y   | 4+N | 12   | CheckBytes | Copy of the beginning of the packet |

Packet is encrypted using DCFB-AES. IV is a concatenation of ***ConnID*** and ***Counter***.
***ConnID*** was provided in the **cought** packet. ***Counter*** is 32-bit integer counter that is incremented by one on each new request.
Retransmission does not increment the counter. Initial value of ***Counter*** was provided in the **cought** packet.

***LowCounter*** contains lower 16 bits of ***Counter*** value. Device have to calculate higher bit of the counter based on ***LowCounter***
overflows.

***Request*** contains request body described below.

***CheckBytes*** are described in **caught** packet.

## Response
Device sends response to previous request if needed.

| Enc | Off | Size | Name       | Description                         |
|-----|-----|------|------------|-------------------------------------|
|     | 0   | 1    | Length     | Total length of the packet          |
|     | 1   | 1    | Type       | Always 3 (**response**)             |
| Y   | 2   | N    | Response   | Content of the response             |
| Y   | 2+N | 12   | CheckBytes | Copy of the beginning of the packet |

Packet is encrypted using DCFB-AES. IV is the same as in associated **request**.

***Response*** contains response body described below.

***CheckBytes*** are described in **caught** packet.

# Notes

> NOTE: Over the air packets contains: Prelambule, Address, Length, Content and CRC.  This documents describes only Length and Content, because rest is handled by the nRF5x HW.

> NOTE: Integer values are stored in little endian byte order.


