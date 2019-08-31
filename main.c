/*
 * RemoteLight.c
 *
 * Created: 2019-08-28 22:53:55
 * Author : Dominik
 */ 

#include <stdint.h>
#include <stdbool.h>
#include <avr/io.h>
#include <util/delay.h>

typedef enum TimerType_tag {
	CH0_SW_FILTER_TIMER = 0,
	CH1_SW_FILTER_TIMER,
	RADIO_BTN_FILTER_TIMER,
	LAST_ON_UPDATE_TIMER,
	LONG_PRESS_TIMER,
	TIMERS_COUNT,
} TimerType;

#define MS2T(msec) ((int32_t)(msec) / (int32_t)1)

#define SWITCH_PORT PORTA
#define SWITCH_DDR DDRA
#define SWITCH_PIN PINA
#define CH0_SWITCH_BIT (1 << 5)
#define CH1_SWITCH_BIT (1 << 6)
#define RADIO_BTN_BIT (1 << 4)
#define CH0_SWITCH (SWITCH_PIN & CH0_SWITCH_BIT)
#define CH1_SWITCH (SWITCH_PIN & CH1_SWITCH_BIT)
#define RADIO_BTN (SWITCH_PIN & RADIO_BTN_BIT)

#define RELAY_PORT PORTD
#define RELAY_DDR DDRD
#define CH0_RELAY_BIT (1 << 4)
#define CH1_RELAY_BIT (1 << 7)

#define CH0_BIT 1
#define CH1_BIT 2
#define RADIO_BIT 4

struct Timer_tag;

typedef void (*TimerCallback)(uintptr_t data);

typedef struct Timer_tag
{
	TimerType type;
	uint16_t time;
	TimerCallback callback;
	uintptr_t data;
} Timer;

Timer timers[(int)TIMERS_COUNT];

enum {
	RADIO_INACTIVE,
	RADIO_OFF,
	RADIO_ON,
} radioState = RADIO_INACTIVE;

uint8_t rawInputState = 0;
uint8_t inputState = 0;
uint8_t outputState = 0;
uint8_t lastOnOutputState = 1;
uint8_t radioDownOutputState = 0;
uint8_t wasLongPress = 0;

uint8_t nextOutputState[] = {
	CH0_BIT,           // 00 -> 01
	CH1_BIT,           // 01 -> 10
	CH0_BIT | CH1_BIT, // 10 -> 11
	CH0_BIT,           // 11 -> 01
};

void startTimer(TimerType timer, uint16_t timeMs, TimerCallback callback, uintptr_t data)
{
	timers[timer].type = timer;
	timers[timer].time = MS2T(timeMs);
	timers[timer].callback = callback;
	timers[timer].data = data;
}

void stopTimer(TimerType timer)
{
	timers[timer].time = 0;
}

void onLongPress(uintptr_t data)
{
	wasLongPress = 1;
	lastOnOutputState = nextOutputState[lastOnOutputState];
	startTimer(LONG_PRESS_TIMER, 1500, onLongPress, 0);
}


void onLastOnUpdate(uintptr_t data)
{
	lastOnOutputState = outputState & (CH0_BIT | CH1_BIT);
}

void onInputChanged(uint8_t bit, uint8_t state)
{
	switch (bit)
	{
		case CH0_BIT:
		case CH1_BIT:
			radioState = RADIO_INACTIVE;
			stopTimer(LAST_ON_UPDATE_TIMER);
			if (inputState & (CH0_BIT | CH1_BIT)) {
				startTimer(LAST_ON_UPDATE_TIMER, 3000, onLastOnUpdate, 0);
			}
			break;
		case RADIO_BIT:
			stopTimer(LONG_PRESS_TIMER);
			if (state)
			{
				radioDownOutputState = outputState;
				radioState = RADIO_ON;
				if (!lastOnOutputState)
				{
					lastOnOutputState = nextOutputState[lastOnOutputState];
				}
				wasLongPress = 0;
				startTimer(LONG_PRESS_TIMER, 2000, onLongPress, 0);
			}
			else if (!wasLongPress && radioDownOutputState)
			{
				radioState = RADIO_OFF;
			}
			break;
	}
}

void onStableInput(uintptr_t data)
{
	uint8_t bit = (uint8_t)data;
	if ((inputState ^ rawInputState) & bit)
	{
		inputState ^= bit;
		onInputChanged(bit, inputState & bit);
	}
}

void updateInput()
{
	uint8_t old = rawInputState;
	rawInputState = 0;
	if (CH0_SWITCH) rawInputState |= CH0_BIT;
	if (CH1_SWITCH) rawInputState |= CH1_BIT;
	if (RADIO_BTN) rawInputState |= RADIO_BIT;
	uint8_t change = old ^ rawInputState;
	if (change & CH0_BIT) startTimer(CH0_SW_FILTER_TIMER, 50, onStableInput, CH0_BIT);
	if (change & CH1_BIT) startTimer(CH1_SW_FILTER_TIMER, 50, onStableInput, CH1_BIT);
	if (change & RADIO_BIT) startTimer(RADIO_BTN_FILTER_TIMER, (rawInputState & RADIO_BIT) ? 50 : 400, onStableInput, RADIO_BIT);
}

void updateOutput()
{
	switch (radioState)
	{
		case RADIO_OFF:
			outputState = 0;
			break;
		case RADIO_ON:
			outputState = lastOnOutputState;
			break;
		case RADIO_INACTIVE:
			outputState = inputState & (CH0_BIT | CH1_BIT);
			break;
	}
	if (outputState & CH0_BIT)
		RELAY_PORT |= CH0_RELAY_BIT;
	else
		RELAY_PORT &= ~CH0_RELAY_BIT;		
	if (outputState & CH1_BIT)
		RELAY_PORT |= CH1_RELAY_BIT;
	else
		RELAY_PORT &= ~CH1_RELAY_BIT;		
}

void updateTimers()
{
	uint8_t i;
	for (i = 0; i < TIMERS_COUNT; i++)
	{
		Timer* t = &timers[i];
		if (t->time > 0)
		{
			t->time--;
			if (t->time == 0)
			{
				t->callback(t->data);
			}
		}
	}
}

void init()
{
	RELAY_DDR |= CH0_RELAY_BIT | CH1_RELAY_BIT;
	SWITCH_PORT |= CH1_SWITCH_BIT;
}

int main()
{
	init();
	while (1)
	{
		updateTimers();
		updateInput();
		updateOutput();
		_delay_ms(1);
	}
}
