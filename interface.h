#ifndef _INTERFACE_H_
#define _INTERFACE_H_

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

extern void mainLoop();

// Device inputs
void measureTemp();
uint16_t getTemp();
uint8_t getInput();

// Buttons input
uint8_t getButtonPulse(uint8_t buttonIndex);

// Device outputs
void setRelay(uint8_t relayIndex, uint8_t state);

// Display output
void setDisplay(uint8_t charIndex, uint8_t content);
void setBrightness(uint8_t value);

// Time input
uint32_t getTime();

// NV mem
void initConfig(void* ptr, uint16_t size);
void saveConfig(uint16_t offset, uint8_t size);


#ifdef __cplusplus
};
#endif

#endif // _INTERFACE_H_
