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


int main(void)
{
	DDRD = (1 << 4);
	DDRD = (1 << 7);
	PORTD = (1 << 4);
	PORTD = (1 << 7);
	
    while (1)
    {
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

