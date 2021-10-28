#ifndef _RADIO_H_
#define _RADIO_H_

EXTERN void initRadio();
EXTERN void shutdownRadio();
EXTERN bool recv(uint32_t timeout);
EXTERN void send();
EXTERN uint8_t* getRecvBuffer();
EXTERN uint8_t* getSendBuffer();
EXTERN uint32_t getRecvTime();

#endif
