/*
	Copyright (C) 2008
		Dominik Kilian <dkilian@op.pl>

	This file is part of USBaspX.

	USBaspX is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; either version 2 of the License, or
	(at your option) any later version.

	USBaspX is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with USBaspX; if not, write to the Free Software
	Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

*/

#include "hwconfig.h"

#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/pgmspace.h>
#include <util/delay.h>

#include "led.h"

// 46 = 1s

uchar ledTimer;

static uchar ledPeriod;
static uchar ledPhase;

static uchar ledOldPeriod;
static uchar ledOldPhase;
static uchar ledLeft;


ISR(TIMER2_OVF_vect, ISR_NOBLOCK)
{
	static uchar count = 0;
	count++;

	if (count > ledPeriod) {
		count = 0;
		if (ledLeft) {
			ledLeft--;
			if (!ledLeft) {
				ledPeriod = ledOldPeriod;
				ledPhase = ledOldPhase;
			}
		}
	}

	if (count < ledPhase) {
		portDDR(portLed) |= 1 << bitLed;
	} else {
		portDDR(portLed) &= ~(1 << bitLed);
	}

	if (ledTimer) ledTimer--;

}


void ledInit(void)
{

	ledPeriod = 255;
	ledPhase = 0;
	ledLeft = 0;
	portPORT(portLed) &= ~(1 << bitLed);

	// ATmega8 have diffrent Timer/Counter 2
#if defined (__AVR_ATmega8__)
	TIMSK |= 1 << TOIE2;
	TCCR2 = 7 << CS20;
#else
	TIMSK2 = 1 << TOIE2;
	TCCR2A = 0;
	TCCR2B = 7 << CS20;
#endif
}


void ledSet(uchar period, uchar phase)
{
	ledPeriod = period;
	ledPhase = phase;
	ledLeft = 0;
}


void ledSetFor(uchar for_periods, uchar period, uchar phase)
{
	if (!ledLeft) {
		ledOldPeriod = ledPeriod;
		ledOldPhase = ledPhase;
	}
	ledPeriod = period;
	ledPhase = phase;
	ledLeft = for_periods;
}









