
#include "common.h"

#define CONN_COUNTER_DIFF_MAX 1024

NOINIT_DATA static uint8_t swappingBuffers[2][256];
NOINIT_DATA static uint8_t sendBuffer[MAX_SEND_SIZE];
static int bufferIndex = 0;
NOINIT_DATA static uint8_t* recvBuffer;
NOINIT_DATA static uint32_t recvTime;


static bool waitForEvent(volatile uint32_t *reg, uint32_t time)
{
	while (!*reg)
	{
		if (timedOut(time))
		{
			return false;
		}
	}
	*reg = 0;
	return true;
}

static void assertEvent(volatile uint32_t *reg)
{
	BL_ASSERT(waitForEvent(reg, getTime() + MS2TICKS(100)));
}

static void startReceiver()
{
	NRF_RADIO->SHORTS = 0;
	NRF_RADIO->PACKETPTR = (uint32_t)&swappingBuffers[bufferIndex];
	bufferIndex ^= 1;
	NRF_RADIO->EVENTS_READY = 0;
	NRF_RADIO->EVENTS_END = 0;
	NRF_RADIO->EVENTS_DISABLED = 0;
    NRF_RADIO->TASKS_RXEN = 1;
	assertEvent(&NRF_RADIO->EVENTS_READY);
	NRF_RADIO->TASKS_START = 1;
}

static void stopReceiver()
{
	NRF_RADIO->TASKS_DISABLE = 1;
	assertEvent(&NRF_RADIO->EVENTS_DISABLED);
}

EXTERN void initRadio()
{
	// TODO: check configuration (and POWER register)
	NRF_RADIO->SHORTS = 0;
	NRF_RADIO->INTENSET = 0; // TODO:
	NRF_RADIO->FREQUENCY = /* TODO: from config */ 24;
	NRF_RADIO->TXPOWER = RADIO_TXPOWER_TXPOWER_Pos4dBm;
	NRF_RADIO->MODE = RADIO_MODE_MODE_Ble_1Mbit;
	NRF_RADIO->PCNF0 = (8 << RADIO_PCNF0_LFLEN_Pos)
		| (0 << RADIO_PCNF0_S0LEN_Pos)
		| (0 << RADIO_PCNF0_S1LEN_Pos);
	NRF_RADIO->PCNF1 = (192 << RADIO_PCNF1_MAXLEN_Pos) // TODO: set maxlen to actual recvBuffer size
		| (0 << RADIO_PCNF1_STATLEN_Pos)
		| (4 << RADIO_PCNF1_BALEN_Pos)
		| (RADIO_PCNF1_ENDIAN_Little << RADIO_PCNF1_ENDIAN_Pos)
		| (RADIO_PCNF1_WHITEEN_Disabled << RADIO_PCNF1_WHITEEN_Pos);
	
	// Default state for RADIO is receiver enabled and started
	startReceiver();
}

EXTERN void shutdownRadio()
{

}

EXTERN uint8_t* getRecvBuffer()
{
	return recvBuffer;
}

EXTERN uint8_t* getSendBuffer()
{
	return sendBuffer;
}

EXTERN uint32_t getRecvTime()
{
    return recvTime;
}

EXTERN bool recv(uint32_t timeout)
{
	do
	{
		// wait for incoming recvBuffer
		if (!waitForEvent(&NRF_RADIO->EVENTS_END, timeout))
		{
			return false;
		}
		recvTime = getTime();
		// switch to second recvBuffer as soon as possible
		NRF_RADIO->PACKETPTR = (uint32_t)&swappingBuffers[bufferIndex];
		NRF_RADIO->TASKS_START = 1;
		bufferIndex ^= 1;
		// parse current recvBuffer
		recvBuffer = swappingBuffers[bufferIndex];
	} while (recvBuffer[0] < 16 || recvBuffer[0] > MAX_PACKET_SIZE);
	return true;
}

EXTERN void send()
{
	// stop receiving as fast as possible
	stopReceiver();
	// enable transmitter
	NRF_RADIO->SHORTS = RADIO_SHORTS_END_DISABLE_Msk;
	NRF_RADIO->EVENTS_READY = 0;
	NRF_RADIO->EVENTS_END = 0;
	NRF_RADIO->EVENTS_DISABLED = 0;
	NRF_RADIO->TASKS_TXEN = 1;
	// wait for trasmitter ready
	assertEvent(&NRF_RADIO->EVENTS_READY);
	// send recvBuffer
	NRF_RADIO->PACKETPTR = (uint32_t)recvBuffer;
	NRF_RADIO->TASKS_START = 1;
	assertEvent(&NRF_RADIO->EVENTS_DISABLED);
	// go back to receiving
	startReceiver();
}
