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

#ifndef uart_h
#define uart_h

#include "hwconfig.h"

#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/pgmspace.h>
#include <avr/wdt.h>
#include <util/delay.h>

#include "usbdrv.h"
#include "main.h"
#include "led.h"
#include "usbcontrol.h"

#include "buffers.h"


typedef struct LineCoding_  
{
	unsigned long dataRate;	// Data terminal rate, in bits per second.
	uchar stopBit;			// Stop bits 0 - 1 Stop bit 1 - 1.5 Stop bits 2 - 2 Stop bits
	uchar parityType;		// Parity 0 - None 1 - Odd 2 - Even 3 - Mark 4 - Space
	uchar dataBits;			// Data bits (5, 6, 7, 8 or 16)
} LineCoding;


extern LineCoding uartLineCoding;


void uartInit(void);
void uartClose(void);
void uartPoll(void);

uchar uartFunctionSetup(void);
uchar uartFunctionRead(uchar *data, uchar len);
uchar uartFunctionWrite(uchar *data, uchar len);
void uartFunctionWriteOut(uchar *data, uchar len);


#endif

