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

#define IDLE 1
#define ACTIVE 2
#define WAITING 3

#define OP_FIRST 1
#define OP_SECOND 2
#define OP_ALL 3

#define MS2T(msec) ((int32_t)(msec) / (int32_t)1)

#define PRESSED (PINA & (1 << 4))
#define CH0 (TODO)
#define CH1 (TODO)

int8_t swCounters[2] = { 0, 0 };
uint8_t swState = 0;
uint8_t swChange = 0;
uint16_t onStateCounter = 0;
uint8_t lastOnState = 1;
uint8_t forcedState = 0;

uint8_t state = IDLE;
uint8_t op = OP_ALL;
bool on = false;
bool oldOn = false;
int32_t time = 0;
int32_t releaseTime = 0;

void update_output()
{
	if (on)
	{
		if (op & OP_FIRST)
			PORTD |= (1 << 4);
		else
			PORTD &= ~(1 << 4);
		if (op & OP_SECOND)
			PORTD |= (1 << 7);
		else
			PORTD &= ~(1 << 7);
	}
	else
	{
		PORTD &= ~((1 << 4) | (1 << 7));
	}
}

void updateCounter(int8_t index, uint8_t st)
{
	uint8_t bit = 1 << index;
	if (st)
	{
		if (swCounters[index] < 10)
			swCounters[index]++;
		else
			swState |= bit;
	}
	else
	{
		if (swCounters[index] > -10)
			swCounters[index]--;
		else
			swState &= ~bit;
	}
}

int main(void)
{
	DDRD = (1 << 4);
	DDRD = (1 << 7);
	PORTD = (1 << 4);
	PORTD = (1 << 7);
	
    while (1)
    {
		uint8_t old = swState;
		updateCounter(0, CH0);
		updateCounter(1, CH1);
		swChange = old ^ swState;
		
		if (swChange || !swState)
		{
			onStateCounter = 0;
		}
		else if (onStateCounter < MS2T(2000))
		{
			onStateCounter++;
		}
		else
		{
			lastOnState = swState;
		}
		
		if (swChange)
		{
			forcedState = 0;
		}
		
		switch (state)
		{
			case IDLE:
				time = 0;
				if (PRESSED)
				{
					oldOn = on;
					state = ACTIVE;
				}
				break;
				
			case ACTIVE:
				on = true;
				if (time > MS2T(1500))
				{
					oldOn = false;
					op++;
					if (op > OP_ALL) op = OP_FIRST;
					time = 0;
				}
				if (!PRESSED)
				{
					releaseTime = time;
					state = WAITING;
				}
				break;
				
			case WAITING:
				on = !oldOn;
				if (time - releaseTime > MS2T(300))
				{
					state = IDLE;
				}
				if (PRESSED)
				{
					state = ACTIVE;
				}
				break;
		}
		update_output();
		_delay_ms(1);
		time++;
    }
}

