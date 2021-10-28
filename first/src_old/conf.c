
#include "common.h" 

enum {
	CONF_FLAG_POWER_ON_RESET     = 0x01,
	CONF_FLAG_PIN_RESET          = 0x02,
	CONF_FLAG_WAKE_UP_RESET      = 0x04,
	CONF_FLAG_WATCHDOG_RESET     = 0x08,
	CONF_FLAG_GPIO_TRIGGER_LEVEL = 0x10,
	CONF_FLAG_GPIO_PULL_UP       = 0x20,
	CONF_FLAG_GPIO_PULL_DOWN     = 0x40,
	CONF_FLAG_GPIO_TIMEOUT_TO_BL = 0x80,
};

typedef struct
{
	uint8_t frequency;
	uint8_t radioDelay;
	uint8_t gpioPinNumber;
	uint8_t gpioDelayTime;
	uint8_t flags;
	char name[32];
	uint8_t salt[8];
	uint8_t key[32];
    uint8_t confSize;
} Conf;


__attribute__((used))
__attribute__((section(".conf")))
static const Conf conf = {
    .frequency = 0xFF,     // maps to 24 (2424 MHz)
	.radioDelay = 0xFF,    // longest possible delay
	.gpioPinNumber = 0xFF, // no GPIO trigger
	.gpioDelayTime = 0xFF, // ignored (no GPIO trigger)
	.flags = 0xFF,         // all possible reset reasons, ignored GPIO configuration
	.name = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
			0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
			0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
			0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF },
	.salt = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF },
	.key = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
			0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
			0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
			0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF },
	.confSize = sizeof(Conf),
};

/*
8	Frequency  freq = 0xE7 ^ value

	Trigger:
		Radio
7			Delay (0 - disable)
		GPIO
7			Pin number
1			Trigger level
7			Delay time
1			After delay: 0 - start bootloader, 1 - start app

	Reset reason:
1		Pin reset
1		Power on reset
1		Power off reset


TIME FORMAT time = (4 + value) << shift:
2	value
4	shift

*/