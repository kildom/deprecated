

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
#define CONF_MAX_SIZE_FIELD ((_AREA_I << 3) | _AREA_P)

#define RESETREAS_EX_FLAG_POWER_ON (1 << 31)

__attribute__((used))
__attribute__((section(".isrcopy")))
struct {
	uint32_t initial_sp;
	uint32_t reset_address;
} isr_copy;


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
static void secondBlEntry(uint32_t bootloaderAddr, uint32_t initialStack, uint32_t entryAddr)
{
	__asm__ volatile (
		"mov SP, r1 \n"
		"bx  r2     \n"
	);
	__builtin_unreachable();
}

__attribute__((noreturn))
static void startSecondBl();

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

	startSecondBl();

	__builtin_unreachable();
}

__attribute__((used))
__attribute__((section(".firstBlIsr")))
const struct {
	uint32_t initial_sp;
	uint32_t reset_address;
	uint32_t bootConfAddress;
	uint32_t isrCopyAddress;
} firstBlIsr = {
	.initial_sp = TARGET_RAM_ADDR + TARGET_RAM_SIZE - 4,
	.reset_address = (uint32_t)&startup,
	.bootConfAddress = (uint32_t)&boot_conf_flash,
	.isrCopyAddress = (uint32_t)&isr_copy,
};


__attribute__((noreturn))
static void startSecondBl()
{
	secondBlEntry((uint32_t)&firstBlIsr, TARGET_RAM_ADDR + TARGET_RAM_SIZE - 4, TARGET_RAM_ADDR);
	__builtin_unreachable();
}
