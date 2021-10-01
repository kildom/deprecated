
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

extern struct {
    volatile uint32_t ECBDATAPTR;
    volatile uint32_t TASKS_STARTECB;
    volatile uint32_t EVENTS_ENDECB;
} *ECB;

#define KEY1 0
#define PT1 4
#define CT1 8
#define KEY2 12
#define PT2 16
#define CT2 20
#define ZEROS 24
#define TOTAL 28


static uint32_t buffer[TOTAL];
static uint32_t *const key1 = &buffer[KEY1];
static uint32_t *const pt1 = &buffer[PT1];
static uint32_t *const ct1 = &buffer[CT1];
static uint32_t *const key2 = &buffer[KEY2];
static uint32_t *const pt2 = &buffer[PT2];
static uint32_t *const ct2 = &buffer[CT2];
static uint32_t *const zeros = &buffer[ZEROS]; // or delete if my_memcpy better

static void do_xor(uint32_t* dst, const uint32_t* a, const uint32_t* b)
{
    size_t i;
    for (i = 0; i < 4; i++)
    {
        dst[i] = a[i] ^ b[i];
    }
}

static void do_aes(uint32_t* data)
{
    ECB->ECBDATAPTR = (uint32_t)data;
    ECB->TASKS_STARTECB = 1;
    while (!ECB->EVENTS_ENDECB);
    ECB->EVENTS_ENDECB = 0;
}

static void aes_dctf_block(const uint32_t* input, uint32_t* output)
{
    do_xor(pt2, pt1, zeros); // or my_memcpy if better
    do_aes(key1);
    do_aes(key2);
    do_xor(pt1, ct1, input);
    do_xor(output, ct2, pt1);
}

void aes_dctf(uint8_t* input, uint8_t* input_last, uint8_t* output, size_t output_step, const uint8_t* iv)
{
    do_xor(pt1, (const uint32_t*)iv, zeros); // or my_memcpy if better
    while (input < input_last)
    {
        aes_dctf_block((const uint32_t*)input, (uint32_t*)output);
        input += 16;
        output += output_step;
    }
}

void example_usage()
{
  // verification
  aes_dctf(RAM_START, AREA_END, AREA_END - 16, 0, AREA_END - 32);
  if (!is_zero(AREA_END - 16, 16)) {
    // failed
    return;
  }
  // decryption
  aes_dctf(RAM_START, AREA_END, RAM_START, 16, AREA_END - 32);
  // start second stage bootloader
  start_from_ram();
  __builtin_unreachable();
}
