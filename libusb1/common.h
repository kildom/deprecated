#ifndef _common_h_
#define _common_h_

#if defined(_MSC_VER) | defined(_VINC)

#include "limits.h"

typedef unsigned char uint8_t;
typedef signed char int8_t;

#if INT_MAX == 32767
typedef unsigned int uint16_t;
typedef signed int int16_t;
#else
typedef unsigned short uint16_t;
typedef signed short int16_t;
#endif

#if INT_MAX == 2147483647
typedef unsigned int uint32_t;
typedef signed int int32_t;
#else
typedef unsigned long uint32_t;
typedef signed long int32_t;
#endif


#else

#include <stdint.h>

#endif

#ifdef _DEBUG_CON

#include <stdio.h>

#define BTDEBUG(params) printf params;
#define BTIFDEBUG(cond, params) if (cond) printf params;

#else

#define BTDEBUG(params)
#define BTIFDEBUG(cond, params)

#endif

#endif
