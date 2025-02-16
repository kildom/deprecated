#ifndef _LOGDPCM_H_
#define _LOGDPCM_H_

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

uint8_t encodeSample(int16_t sampleValue, int16_t* state);
int16_t decodeSample(uint8_t encoded, int16_t* state);
int16_t decodeSampleSafe(uint8_t encoded, int16_t* state);

uint8_t encodeSample4(int16_t sampleValue, int16_t* state);
int16_t decodeSample4(uint8_t encoded, int16_t* state);
int16_t decodeSampleSafe4(uint8_t encoded, int16_t* state);

#ifdef __cplusplus
}
#endif

#endif
