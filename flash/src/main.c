

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#include <nrf.h>

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

#define RESETREAS_EX_FLAG_POWER_ON (1 << 31)

__attribute__((used))
__attribute__((section(".isrcopy")))
struct {
	uint32_t initial_sp;
	uint32_t reset_address;
} isr_copy;

typedef struct {
	// beginning of BOOT packet
	uint8_t salt[8];
	uint8_t keyConf[4];
	uint8_t hwid;
	uint8_t maxSize;
	uint8_t counter;
	// end of BOOT packet
	uint8_t reserved;
	uint32_t resetreas_flags;
	uint8_t key[32];
} boot_conf_t;

__attribute__((used))
__attribute__((section(".conf")))
boot_conf_t boot_conf = {
	.salt = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF },
	.keyConf = { 0xFF, 0xFF, 0xFF, 0xFF },
	.hwid = TARGET_HWID,
	.maxSize = MAX_SIZE_FIELD,
	.counter = 4,
	.reserved = 0,
	.resetreas_flags = ~RESETREAS_EX_FLAG_POWER_ON,
	.key = {
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
		0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
	},
};

extern const boot_conf_t __conf_text_start__;
#define boot_conf_flash __conf_text_start__

__attribute__((used))
__attribute__((section(".noinitconf")))
uint8_t cipher_workspace[16 * 6 - 32];

uint32_t *const key1 = (uint32_t *)&boot_conf.key[0];
uint32_t *const pt1 = (uint32_t *)&boot_conf.key[16];
uint32_t *const ct1 = (uint32_t *)&cipher_workspace[0];
uint32_t *const key2 = (uint32_t *)&cipher_workspace[16];
uint32_t *const pt2 = (uint32_t *)&cipher_workspace[32];
uint32_t *const ct2 = (uint32_t *)&cipher_workspace[48];


static void small_memcpy(void* dst, const void* src, size_t len)
{
	uint8_t* d = dst;
	const uint8_t* s = src;
	uint8_t* e = d + len;
	while (d < e) {
		*d++ = *s++;
	}
}

static void small_memzero(void* dst, size_t len)
{
	uint8_t* d = dst;
	uint8_t* e = d + len;
	while (d < e) {
		*d++ = 0;
	}
}

__attribute__((naked))
__attribute__((noreturn))
static void ramAppEntry(uint32_t bootloaderAddr, uint32_t initialStack, uint32_t entryAddr)
{
	__asm__ volatile (
		"mov SP, r1 \n"
		"bx  r2     \n"
	);
	__builtin_unreachable();
}

__attribute__((noreturn))
static void startRamApp();

void main() {
	initTimer();
	initRadio();
	do {
		sendBootPacket();
		delay(boot_conf.counter & 3);
	} while (boot_conf.counter--);
	switchRadio();
	startTimer();
}

__attribute__((noreturn))
void startApp()
{
	SCB->AIRCR = SCB_AIRCR_SYSRESETREQ_Msk | (0x05FA << SCB_AIRCR_VECTKEY_Pos);
	while (1);
}

__attribute__((noreturn))
void startup(void)
{
	extern uint8_t __etext;
	extern uint8_t __data_start__;
	extern uint8_t __data_end__;
	
	uint32_t reas = NRF_POWER->RESETREAS;
	if (reas == 0) {
		reas |= RESETREAS_EX_FLAG_POWER_ON;
	}
	reas &= boot_conf_flash.resetreas_flags;
	if (reas != 0)
	{
		__asm__ volatile (
			"mov PC, %0 \n"
			"bx  %1     \n"
			:: "r" (isr_copy.initial_sp), "r" (isr_copy.reset_address)
		);
		__builtin_unreachable();
	}

	small_memcpy(&__data_start__, &__etext, (uint32_t)&__data_end__ - (uint32_t)&__data_end__);
	small_memzero((void*)TARGET_RAM_ADDR, (uint32_t)&__data_start__ - TARGET_RAM_ADDR);
	small_memcpy(key2, pt1, 16);

	main();

	startRamApp();

	__builtin_unreachable();
}

__attribute__((used))
__attribute__((section(".boot_isr")))
const struct {
	uint32_t initial_sp;
	uint32_t reset_address;
	uint32_t boot_conf_address;
	uint32_t isr_copy_address;
} boot_isr = {
	.initial_sp = TARGET_RAM_ADDR + TARGET_RAM_SIZE - 4,
	.reset_address = (uint32_t)&startup,
	.boot_conf_address = (uint32_t)&boot_conf_flash,
	.isr_copy_address = (uint32_t)&isr_copy,
};


__attribute__((noreturn))
static void startRamApp()
{
	ramAppEntry((uint32_t)&boot_isr, TARGET_RAM_ADDR + TARGET_RAM_SIZE - 4, TARGET_RAM_ADDR);
	__builtin_unreachable();
}
