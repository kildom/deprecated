
__attribute__((used))
__attribute__((section(".isrcopy")))
struct {
	uint32_t initialSp;
	uint32_t resetAddress;
} isrCopy;


__attribute__((noreturn))
static void startSecondBl();


__attribute__((noreturn))
static void startup(void)
{
	extern uint8_t __etext;
	extern uint8_t __data_start__;
	extern uint8_t __data_end__;
	
	uint32_t reas = NRF_POWER->RESETREAS;
	if (reas == 0) {
		reas |= RESETREAS_EX_FLAG_POWER_ON;
	}
	reas &= bootConfFlash.resetreasFlags;
	if (reas != 0)
	{
		__asm__ volatile (
			"mov PC, %0 \n"
			"bx  %1     \n"
			:: "r" (isrCopy.initialSp), "r" (isrCopy.resetAddress)
		);
		__builtin_unreachable();
	}

	memCopy(&__data_start__, &__etext, (uint32_t)&__data_end__ - (uint32_t)&__data_end__);
	memZero((void*)TARGET_RAM_ADDR, (uint32_t)&__data_start__ - TARGET_RAM_ADDR);
	memCopy(key2, pt1, 16);

	blMain();

	startSecondBl();

	__builtin_unreachable();
}


__attribute__((used))
__attribute__((section(".boot_isr")))
const struct {
	uint32_t initialSp;
	uint32_t resetAddress;
	uint32_t bootConfAddress;
	uint32_t isrCopyAddress;
} blIsr = {
	.initialSp = TARGET_RAM_ADDR + TARGET_RAM_SIZE - 4,
	.resetAddress = (uint32_t)&startup,
	.bootConfAddress = (uint32_t)&bootConfFlash,
	.isrCopyAddress = (uint32_t)&isrCopy,
};


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
static void startSecondBl()
{
	secondBlEntry((uint32_t)&blIsr, TARGET_RAM_ADDR + TARGET_RAM_SIZE - 4, TARGET_RAM_ADDR);
	__builtin_unreachable();
}


__attribute__((noreturn))
static void startApp()
{
	SCB->AIRCR = SCB_AIRCR_SYSRESETREQ_Msk | (0x05FA << SCB_AIRCR_VECTKEY_Pos);
	while (true);
}
