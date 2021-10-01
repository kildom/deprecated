
# First stage bootloader

1. Device sends **`Boot`** packets N times, where N is configurable.
2. Device switches to the receiving state.
3. Controller sends entire second stage bootloader in the **`Block`** packets.
4. When controller sends the last block, the device will verify and start second stage bootloader.
5. The controller waits for a second stage bootloader response.
6. If second stage bootloader did not start, controller repeats the procedure starting from point 3.


## `Boot`
Device sends this packet to inform that the bootloader just started and it is waiting for further communication.
It can be send more than once depending on the configuration.

| Off | Size   | Name       | Description                                            |
|----:|-------:|------------|--------------------------------------------------------|
| 0   | 8      | `Salt`     | Random salt bytes for device key generation            |
| 8   | 4      | `KeyConf`  | Key confirmation data                                  |
| 12  | 1      | `HWID`     | Value that identifies the hardware                     |
| 13  | 1      | `MaxSize`  | Second Stage Bootloader maximum size                   |
| 14  | 1      | `Counter`  | Packet repeat counter                                  |
|     | **15** |            | **Total packet size**                                  |

Each device has a unique encryption key generated from user provided *Password* using following method:
```
Salt = 8 random bytes
Key = SHA-256(Salt & Password & "RecoveryBootloaderPassword")
```
*& sign indicates concatenation.*

**`Salt`** and *Key* are stored on the device. **`Salt`** is send by this packet allowing controller to generate device *Key* for this connection.

> SECURITY NOTE: **`Salt`** may be used to uniquly indentify the device. Because of that, this protocol cannot be used
> if device needs anonymity. This can be solved by using the same **`Salt`** on every device, but this solution creates the
> same key for each device, so breaking one device allows full access to all devices.

**`KeyConf`** contains key confirmation data. After controller calculated the *Key*, it should verify if the key is correct using this field.
It contains first 4 bytes of `SHA-256(Salt & Key & "RecoveryBootloaderKey")`.

**`HWID`** field contains chip number. List of chip numbers is specific to this protocol.

**`MaxSize`** contains byte with encoded size of the area reserved for the second stage bootloader. The area always starts at the beginning of a RAM.
It is encoded in two bit fields as follows:
```
+MSB+---+---+---+---+---+---+LSB+
|         I         |     P     |      size = (32 + I) * 2 ^ (7 + P)
+---+---+---+---+---+---+---+---+
```

**`Counter`** contains integer that tells how many **`Boot`** packets will be send after this one.
Last **`Boot`** packet will have **`Counter`** equals zero. This field is used to calculate time to start sending **`Block`** packets.

## `Block`
Controller sends a single block of the second stage bootloader.

| Off | Size   | Name         | Description                         |
|----:|-------:|--------------|-------------------------------------|
| 0   | 2      | BlockIndex   | Block index                         |
| 2   | 32     | Content      | Content of the block                |
|     | **34** |              | **Total packet size**               |

Second stage bootloader is encrypted with the AES-DCFB. After that, it is divided into 32-byte blocks.
Last block on the area reserved for second stage bootloader contains *IV* followed by 16-byte verification block.

Content of the area reserved for second stage bootloader:

| Offset         | Size           | Before decryption         | After decryption |
|---------------:|---------------:|---------------------------|------------------|
|              0 | `MaxSize` - 32 | Encrypted bootloader code | Bootloader code  |
| `MaxSize` - 32 |             16 | IV                        | Trash            |
| `MaxSize` - 16 |             16 | Verification block        | Zeros            |

When the device receives last block it will decode entire second stage bootloader area (including *IV* and verification block) without writing the result.
Bootlaoder is valid when the last 16-bytes of the decode data are zeros. If it is valid, the device will decode evrything again, this time writing back to RAM.
Next, it will start the second stage bootloader by jumping to the beginning of RAM.

# OLD IDEA

# Packets

## Started
Device sends this packet to inform that the bootloader just started and it is waiting for further communication. Additionally, this packet contains information needed to verify password and start a secure connection. It can be send more than once depending on the configuration.

| Enc | Off | Size   | Name       | Description                                            |
|-----|-----|--------|------------|--------------------------------------------------------|
|     | 0   | 8      | Salt       | Random salt bytes for device key generation            |
|     | 8   | 12     | IV         | Initialization vector for encryption of remaining data |
| Y   | 20  | 14     | ConnID     | Random Connection ID                                   |
| Y   | 34  | 1      | HW ID      | Value that identifies the hardware                     |
| Y   | 35  | 1      | Counter    | Packet repeat counter                                  |
| Y   | 36  | 16     | CheckBytes | All zeros                                              |
|     |     | **52** |            | **Total packet size**                                  |

***IV*** field contains last 12 bytes of initialization vector used to encrypt this packet.
First 4 bytes of the initialization vector are taken from the end of ***Salt***

***ConnID***, ***Counter*** and ***CheckBytes*** are encrypted using DCFB-AES with *IV* and *Key* parameters as described above.

***ConnID*** and ***Counter*** are used later to encrypt **block** packet.

***CheckBytes*** contains zeros.

***CheckBytes*** is used to check integrity and to authorize the packet. DCFB-AES has property of error propagation, so if
one encrypted byte was altered then block containing that byte and all following blocks will be altered. Because of that,
if any encrypted byte was altered, key or IV was invalid then ***CheckBytes*** field will be invalid.

## Block
Controller sends one block of second stage bootloader.

| Enc | Off | Size   | Name         | Description                         |
|-----|-----|--------|--------------|-------------------------------------|
|     | 0   | 2      | BlockIndex   | Block index                         |
| Y   | 2   | 64     | Content      | Content of the block                |
| Y   | 66  | 16     | CheckBytes   | Zeros                               |
|     |     | **82** |              | **Total packet size**               |

Packet is encrypted using DCFB-AES. IV is a concatenation of ***ConnID*** and ***BlockIndex***.

***BlockIndex*** is an index of current second stage bootloader block. Second stage bootloader is divided into 64-byte blocks indexed from zero. Padding should added to the last block if needed.

***CheckBytes*** are zeros and they are described in the **started** packet.

## Start
Controller sends hash of the second stage bootloader and requests start if valid.

| Enc | Off | Size   | Name         | Description                         |
|-----|-----|--------|--------------|-------------------------------------|
|     | 0   | 2      | BlockIndex   | 0xFFFF                              |
| Y   | 2   | 16     | Hash         | Hash of the bootloader              |
| Y   | 18  | 48     | Padding      | Ignored                             |
| Y   | 66  | 16     | CheckBytes   | Zeros                               |
|     |     | **82** |              | **Total packet size**               |

***BlockIndex*** is 0xFFFF to indicate that it is a **Start** packet.

***Hash** is a hash of entire space for second stage bootloader including unused blocks.

***CheckBytes*** are zeros and they are described in the **started** packet.

------------------------------------------------------------

# OLD IDEA 2

Below approach probably needs more flash size than available in the MBR unused space.

------------------------------------------------------------

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

# Requests

## Get Device Info

Query for device information.

Request:
| Off | Size | Name | Description        |
|-----|------|------|--------------------|
| 0   | 1    | Id   | 0: GET_DEVICE_INFO |

Response:
| Off | Size | Name             | Description                                            |
|-----|------|------------------|--------------------------------------------------------|
| 0   | 2    | PagesAndArrdType | bits 0-14: Number of flash pages, bit 15: Address type |
| 2   | 1    | BlocksPerPage    | Number of 128-byte blocks in one flash page            |
| 3   | 1    | BlocksForRamApp  | Number of 128-byte blocks for second stage bootloader  |
| 4   | 8    | DeviceId[2]      | nRF5x device id                                        |
| 12  | 4    | AddrLow          | Lower 32 bits of nRF5x device address                  |
| 16  | 2    | AddrHi           | Higer 16 bits of nRF5x device address                  |
| 18  | 2    | HWID             | nRF5x hardware id                                      |
| 20  | N    | Name             | Device name                                            |

## Write block

Writes block of 128 bytes of second stage bootloader to RAM. Second stage boootloader is aligned to block boudary by padding with any value.

Request:
| Off | Size | Name  | Description    |
|-----|------|-------|----------------|
| 0   | 1    | Id    | 1: WRITE_BLOCK |
| 1   | 1    | Index | Block index    |
| 1   | 128  | Block | Block data     |

Response: **NONE**

## Get Status

Get status which blocks of second stage bootloader were received.

Request:
| Off | Size | Name | Description        |
|-----|------|------|--------------------|
| 0   | 1    | Id   | 2: GET_STATUS      |

Response:
| Off | Size | Name                 | Description                                     |
|-----|------|----------------------|-------------------------------------------------|
| 0   | N    | ReceivedBlocksBitmap | Bitmap containing bit 1 for each received block |

If block index 0 was received then bit 0 in byte 0 is set.
If block index 1 was received then bit 1 in byte 0 is set.
If block index 8 was received then bit 0 in byte 1 is set.
And so on.

GET_HASH request clears the bitmap.

## Get Hash

Get simple hash of received application.

Request:
| Off | Size | Name | Description        |
|-----|------|------|--------------------|
| 0   | 1    | Id   | 3: GET_HASH        |

Response:
| Off | Size | Name | Description                |
|-----|------|------|----------------------------|
| 0   | 16   | Hash | Hash calculated using SAHF |

If there are some missing blocks then resulting hash is unpredicable. This hash is not cryptographically secure.

## Start Application

Start second stage bootloader (RAM Application).

Request:
| Off | Size | Name | Description        |
|-----|------|------|--------------------|
| 0   | 1    | Id   | 4: START_APP       |

Response: **NONE**

## Start MBR

Shut down the bootloader and give control to MBR to start normal startup process.

Request:
| Off | Size | Name | Description        |
|-----|------|------|--------------------|
| 0   | 1    | Id   | 5: START_MBR       |

Response: **NONE**

# Notes

> NOTE: Over the air packets contains: Prelambule, Address, Length, Content and CRC.  This documents describes only Length and Content, because rest is handled by the nRF5x HW.

> NOTE: Integer values are stored in little endian byte order.


