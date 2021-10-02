

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define _ALLOWED_SIZE (TARGET_RAM_SIZE - TARGET_RAM_USAGE)

#if _ALLOWED_SIZE < 8192
	#define _AREA_P 0
#elif _ALLOWED_SIZE < 16384
	#define _AREA_P 1
#elif _ALLOWED_SIZE < 32768
	#define _AREA_P 2
#elif _ALLOWED_SIZE < 65536
	#define _AREA_P 3
#elif _ALLOWED_SIZE < 131072
	#define _AREA_P 4
#elif _ALLOWED_SIZE < 262144
	#define _AREA_P 5
#elif _ALLOWED_SIZE < 524288
	#define _AREA_P 6
#else
	#define _AREA_P 7
#endif

#define _AREA_I ((_ALLOWED_SIZE >> (7 + _AREA_P)) - 32)
#if _AREA_I > 31
#undef _AREA_I
#define _AREA_I 31
#endif

#define AREA_SIZE ((32 + _AREA_I) * (1 << (7 + _AREA_P)))
#define MAX_SIZE_FIELD ((_AREA_I << 3) | _AREA_P)

__attribute__((used))
__attribute__((section(".mbr_reset_copy")))
const volatile void* mbr_isr_vector_copy[2] = {
	0,
	0,
};

__attribute__((used))
__attribute__((section(".conf")))
struct {
	// beginning of BOOT packet
	uint8_t salt[8];
	uint8_t keyConf[4];
	uint8_t hwid;
	uint8_t maxSize;
	uint8_t counter;
	// end of BOOT packet
	uint8_t padding;
	uint8_t key[32];
} boot_conf = {
	.salt = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF },
	.keyConf = { 0xFF, 0xFF, 0xFF, 0xFF },
	.hwid = TARGET_HWID,
	.maxSize = MAX_SIZE_FIELD,
	.counter = 4,
	.key = {
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
	},
};

__attribute__((used))
__attribute__((section(".noinitconf")))
uint8_t cipher_workspace[16 * 6 - 32];

uint32_t *const key1 = (uint32_t *)&boot_conf.key[0];
uint32_t *const pt1 = (uint32_t *)&boot_conf.key[16];
uint32_t *const ct1 = (uint32_t *)&cipher_workspace[0];
uint32_t *const key2 = (uint32_t *)&cipher_workspace[16];
uint32_t *const pt2 = (uint32_t *)&cipher_workspace[32];
uint32_t *const ct2 = (uint32_t *)&cipher_workspace[48];

__attribute__((used))
__attribute__((section(".noinit")))
uint32_t __NO_INIT___NO_INIT___NO_INIT_;

__attribute__((used))
const char __IN_FLASH___IN_FLASH___IN_FLASH_[] = "\xDE\xAD\xBE\xEF\xDE\xAD\xBE\xEF\xDE\xAD\xBE\xEF";

__attribute__((used))
uint32_t __ZERO_INIT___ZERO_INIT___ZERO_INIT___ZERO_INIT_;

__attribute__((used))
char __DATA_INIT___DATA_INIT___DATA_INIT___DATA_INIT_[] = "\xAA\xBB\xCC\xDD\xAA\xBB\xCC\xDD\xAA\xBB\xCC\xDD\xAA\xBB\xCC\xDD\xAA\xBB\xCC\xDD";

static void my_memcpy(void* dst, const void* src, size_t len)
{
	uint8_t* d = dst;
	const uint8_t* s = src;
	uint8_t* e = d + len;
	while (d < e) {
		*d++ = *s++;
	}
}

static void my_memzero(void* dst, size_t len)
{
	uint8_t* d = dst;
	uint8_t* e = d + len;
	while (d < e) {
		*d++ = 0;
	}
}

__attribute__((used))
__attribute__((section(".startup")))
void startup(void)
{
	extern uint8_t __etext;
	extern uint8_t __data_start__;
	extern uint8_t __data_end__;

	my_memcpy(&__data_start__, &__etext, (uint32_t)&__data_end__ - (uint32_t)&__data_end__);
	my_memzero((void*)TARGET_RAM_ADDR, (uint32_t)&__data_start__ - TARGET_RAM_ADDR);
	my_memcpy(key2, pt1, 16);

	while (1);
}

__attribute__((used))
__attribute__((section(".publicinfo")))
const struct {
	uint32_t boot_jump_address;
	uint32_t boot_conf_address;
} public_info = {
	.boot_jump_address = (uint32_t)&startup,
	.boot_conf_address = (uint32_t)&boot_conf,
	// TODO: public info should contain:
	//  - initial SP    \___ ISR of bootloader that should be programmed at FLASH 0
	//  - reset address /
	//  - original ISR copy address
	//  - configuration address
};
