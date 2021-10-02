# Second stage packets format

Second stage bootloader communication uses Request/Response packets defined by first stage packets format.

## Configuration format

| Off | Size | Name                    | Description                                                          |
|-----|------|-------------------------|----------------------------------------------------------------------|
| 0   | 1    | frequency               | Radio frequency                                                      |
| 1   | 1    | radioDelay              | Time that radio will be listening for \*catch\* packets              |
| 2   | 1    | gpioPinNumber           | Pin number for bootloader triggering or 0xFF to disable GPIO trigger |
| 3   | 1    | gpioDelay               | How long bootloader will wait until next gpio action \(see flags\)   |
| 4   | 1    | flags                   | Flags:                                                               |
|     |      | 0 \- power\-on reset    | Start bootloader on power\-on reset                                  |
|     |      | 1 \- pin reset          | Start bootloader on pin reset                                        |
|     |      | 2 \- wake up reset      | Start bootloader on wake up from system off                          |
|     |      | 3 \- watchdog reset     | Start bootloader on watchdog reset                                   |
|     |      | 4 \- GPIO trigger level | If set, triggers bootloader when pin is high                         |
|     |      | 5 \- GPIO pull up       | If set, enable pull up resistor                                      |
|     |      | 6 \- GPIO pull down     | If set, enable pull down resistor                                    |
|     |      | 7 \- GPIO active delay  | Mode of GPIO delay                                                   |
| 5   | 32   | name                    | User frendly device name in UTF-8, padded with zeros                 |
| 37  | 8    | salt                    | Cryptographic salt for key generation                                |
| 45  | 32   | key                     | Connection key                                                       |
| 77  | 1    | confSize                | Size of this configuration, always 78                                |

***frequency*** value defines radio frequency based on following formula:
```
BASE = (frequency & 0x80) ? 2360 : 2400
actual_frequency_in_MHz = BASE + ((0x7F & frequency) ^ 0xE7)
```

***GPIO active delay*** flag defines behavior when GPIO trigger is active:
 * 0 - when GPIO is active, bootloader is waiting ***gpioDelay*** with RADIO disabled.
   After that time bootloader continues the work.
   If GPIO becomes inactive during  ***gpioDelay***, normal startup of application will happen.
 * 1 - when GPIO is active, RADIO is enabled and bootloader is listening for **catch** packet.
   After ***gpioDelay*** application will be started.
   If GPIO becomes inactive and ***radioDelay*** passed, application will be started.

***confSize*** value is always 78, but can be increased when the configuration will be extended.
Configuration have to be backward compatible.

### Time format

Time is expressed in milliseconds. It is floating point value defined by following formula:
```
frac = lower 4 bits of value
exp = higher 4 bits of value
if exp == 15 then
    time in ms = frac
else
    time in ms = (16 + frac) << exp
```

