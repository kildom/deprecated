#ifndef _INTERFACE_H_
#define _INTERFACE_H_

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define BUTTON_OK 0
#define BUTTON_UP 1
#define BUTTON_DOWN 2

#define RELAY_PLUS 0
#define RELAY_MINUS 1
#define RELAY_POMP 2

#define CHAR_INDEX_A 0
#define CHAR_INDEX_B 1
#define CHAR_INDEX_ICONS 2

#define CHAR_SPACE 10
#define CHAR_R 11
#define CHAR_WITH_DOT 0x80

#define ICON_POMP 128
#define ICON_ZAW 64
#define ICON_BOOK 2
#define ICON_DEG 4
#define ICON_UP 8
#define ICON_DOWN 32

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
