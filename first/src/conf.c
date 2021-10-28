
typedef struct {
	// beginning of BOOT packet
	uint8_t salt[8];
	uint8_t keyConf[4];
	uint8_t hwid;
	uint8_t maxSize;
	uint8_t counter;
	// end of BOOT packet
	uint8_t frequency;
	uint32_t resetreasFlags;
	uint8_t key[32];
} BootConf;

__attribute__((used))
__attribute__((section(".conf")))
BootConf bootConf = {
	.salt = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF },
	.keyConf = { 0xFF, 0xFF, 0xFF, 0xFF },
	.hwid = TARGET_HWID,
	.maxSize = CONF_MAX_SIZE_FIELD,
	.counter = 4,
	.frequency = 24,
	.resetreasFlags = ~RESETREAS_EX_FLAG_POWER_ON,
	.key = {
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
	},
};

extern const BootConf __conf_text_start__;
#define bootConfFlash __conf_text_start__

__attribute__((used))
__attribute__((section(".noinitconf")))
uint8_t cipherWorkspace[16 * 6 - 32];

static uint32_t *const key1 = (uint32_t *)&bootConf.key[0];
static uint32_t *const pt1 = (uint32_t *)&bootConf.key[16];
static uint32_t *const ct1 = (uint32_t *)&cipherWorkspace[0];
static uint32_t *const key2 = (uint32_t *)&cipherWorkspace[16];
static uint32_t *const pt2 = (uint32_t *)&cipherWorkspace[32];
static uint32_t *const ct2 = (uint32_t *)&cipherWorkspace[48];
