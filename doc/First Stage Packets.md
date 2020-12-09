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

| Off | Size | Name       | Description                                            |
|-----|------|------------|--------------------------------------------------------|
| 0   | 1    | Length     | Always 50                                              |
| 1   | 1    | Type       | Always 1 (**cought**)                                  |
| 2   | 8    | Salt       | Random salt bytes for device key generation            |
| 10  | 12   | IV         | Initialization vector for encryption of remaining data |
| 22  | 12   | ConnID     | Random Connection ID                                   |
| 34  | 4    | Counter    | Random initial value of counter                        |
| 38  | 12   | CheckBytes | Copy of the beginning of the packet                    |

## Request
Controller requests device to do something.

| Off | Size | Name       | Description                         |
|-----|------|------------|-------------------------------------|
| 0   | 1    | Length     | Total length of the packet          |
| 1   | 1    | Type       | Always 2 (**request**)              |
| 2   | 2    | LowCounter | Lower 16 bits of counter value      |
| 4   | N    | Request    | Content of the request              |
| 4+N | 12   | CheckBytes | Copy of the beginning of the packet |

## Response
Device sends response to previous request if needed.

| Off | Size | Name       | Description                         |
|-----|------|------------|-------------------------------------|
| 0   | 1    | Length     | Total length of the packet          |
| 1   | 1    | Type       | Always 2 (**request**)              |
| 2   | N    | Response   | Content of the response             |
| 2+N | 12   | CheckBytes | Copy of the beginning of the packet |


> NOTE: Over the air packets contains: Prelambule, Address, Length, Content and CRC.  This documents describes only Length and Content, because rest is handled by the nRF5x HW.

> NOTE: Integer values are stored in little endian byte order.


