#ifndef _btlink_h
#define _btlink_h

#include "common.h"

#define BTLINK_OK 0
#define BTLINK_DETACHED (-1)
#define BTLINK_TIMEOUT (-2)
#define BTLINK_UNKNOWN (-99)

extern uint8_t btLinkBuffer[258];

#define BTLINK_COMMAND_BUFFER (btLinkBuffer)
#define BTLINK_EVENT_BUFFER (btLinkBuffer)

int8_t btLinkInit();

int8_t btLinkGetState();
int8_t btLinkAttach();
int8_t btLinkDetach();

int8_t btLinkSendCommand();
int8_t btLinkRecvEvent(uint16_t timeout);

int16_t btLinkSendAcl(void* buffer);

int16_t btLinkRecvAcl(void* buffer, uint16_t size, int16_t timeout);

#endif
