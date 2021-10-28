#ifndef _STARTUP_H_
#define _STARTUP_H_


#define _SECOND_BL_ALLOWED (TARGET_RAM_SIZE - TARGET_RAM_USAGE)

#if _SECOND_BL_ALLOWED < 8192
	#define _MAX_SIZE_P 0
#elif _SECOND_BL_ALLOWED < 16384
	#define _MAX_SIZE_P 1
#elif _SECOND_BL_ALLOWED < 32768
	#define _MAX_SIZE_P 2
#elif _SECOND_BL_ALLOWED < 65536
	#define _MAX_SIZE_P 3
#elif _SECOND_BL_ALLOWED < 131072
	#define _MAX_SIZE_P 4
#elif _SECOND_BL_ALLOWED < 262144
	#define _MAX_SIZE_P 5
#elif _SECOND_BL_ALLOWED < 524288
	#define _MAX_SIZE_P 6
#else
	#define _MAX_SIZE_P 7
#endif

#define _MAX_SIZE_I ((_SECOND_BL_ALLOWED >> (7 + _MAX_SIZE_P)) - 32)
#if _MAX_SIZE_I > 31
#undef _MAX_SIZE_I
#define _MAX_SIZE_I 31
#endif

#define SECOND_BL_SIZE ((32 + _MAX_SIZE_I) * (1 << (7 + _MAX_SIZE_P)))
#define CONF_MAX_SIZE_FIELD ((_MAX_SIZE_I << 3) | _MAX_SIZE_P)

#define RESETREAS_EX_FLAG_POWER_ON (1 << 31)

static uint8_t *const secondBlArea = (uint8_t *)TARGET_RAM_ADDR;
static uint8_t *const secondBlAreaEnd = (uint8_t *)(TARGET_RAM_ADDR + SECOND_BL_SIZE);

#endif // _STARTUP_H_
