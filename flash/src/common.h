#ifndef _COMMON_H_
#define _COMMON_H_

#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

#include <nrf.h>

#define BLOCK_SIZE      128
#define MAX_BLOCK_COUNT 256
#define MAX_RECV_SIZE   (BLOCK_SIZE + 16)
#define MAX_SEND_SIZE   66

#define NOINIT_DATA __attribute__((section(".noinit")))

#define ARRAY_LEN(arr) (sizeof(arr) / sizeof((arr)[0]))

#define FORCE_LONG_JUMP(func) ((typeof(&(func)))_LONG_JUMP_helper(&(func)))
static inline void* _LONG_JUMP_helper(void* p) {
	__asm__ volatile ("":"+r"(p));
	return p;
}

#ifdef DUMMY_LTO
#define EXTERN static
#else
#define EXTERN
#endif

#ifdef __unix
#undef __unix
#endif

#include "conf.h"
#include "conn.h"
#include "crypto.h"
#include "main.h"
#include "radio.h"
#include "rand.h"
#include "req.h"
#include "startup.h"
#include "timer.h"
#include "utils.h"

#endif
