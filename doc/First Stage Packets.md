
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
| 0   | 6      | `ExpProg`  | First 6 bytes of expected program hash                 |
| 6   | 1      | `HWID`     | Value that identifies the hardware                     |
| 7   | 1      | `Counter`  | Packet repeat counter                                  |
|     | **8**  |            | **Total packet size**                                  |

**`ExpProg`** allows identification of second stage bootloader program that must be uploaded to the device.
For security reasons, only a spcific program will be accepted.
Full hash is hardcoded in the first stage bootloader.
This field can also be used to identify the `Boot` packet.

**`HWID`** field contains chip number. List of chip numbers is specific to this protocol.

**`MaxSize`** contains byte with encoded size of the area reserved for the second stage bootloader. The area always starts at the beginning of a RAM.
It is encoded in two bit fields as follows:
```
+MSB+---+---+---+---+---+---+LSB+
|         I         |     P     |      size = (32 + I) * 2 ^ (7 + P)
+---+---+---+---+---+---+---+---+
```

**`Counter`** contains integer that tells how many **`Boot`** packets will be send after this one.
Last **`Boot`** packet will have **`Counter`** equals zero.
This field is used to calculate time to start sending **`Block`** packets.

## `Block`
Controller sends a single block of the second stage bootloader.

| Off | Size   | Name         | Description                         |
|----:|-------:|--------------|-------------------------------------|
| 0   | 2      | BlockIndex   | Block index                         |
| 2   | 16     | Content      | Content of the block                |
|     | **18** |              | **Total packet size**               |

When the device receives last block it will verify hash.
If it is valid, the device will start the second stage bootloader by jumping to the beginning of RAM.

Hashing
-------

Normally, hashing functions requires significant size of code/data.
To reduce footprint, AES perripherial can be used in MDC-2 algorithm (or Hirose’s double block mode).

Some links:
* https://en.wikipedia.org/wiki/MDC-2
* https://www.esat.kuleuven.be/cosic/publications/article-2098.pdf
* https://link.springer.com/content/pdf/10.1007/3-540-48329-2_31.pdf
* https://csrc.nist.rip/groups/ST/hash/documents/HIROSE_article.pdf
* https://www.frisc.no/wp-content/uploads/2012/02/LRK-handout-blockcipher.pdf
