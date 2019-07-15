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
#include <avr/wdt.h>
#include <util/delay.h>

#include "usbdrv.h"
#include "usbcontrol.h"
#include "led.h"
#include "asp.h"
#include "uart.h"
#include "clock.h"


/* Device mode  */
uchar cdcMode;

/* Mode switch macros */
#define initSwitch() portDDR(portSwitch) &= ~(1 << bitSwitch); portPORT(portSwitch) |= (1 << bitSwitch);
#define getSwitch() (!(portPIN(portSwitch) & (1 << bitSwitch)))


int main(void)
{

    wdt_enable(WDTO_2S);

	initSwitch();
	ledInit();
	ledPowered();
	clockInit();

    usbDeviceDisconnect();
    _delay_ms(1000);
    usbDeviceConnect();

	cdcMode = getSwitch();

	if (cdcMode)
		uartInit();

	aspInit();
    usbInit();

    sei();

	for(;;) {

        wdt_reset();

		if (cdcMode != getSwitch())	{
			for (;;) {
				_delay_ms(100);
				if (cdcMode == getSwitch()) {
					if (!cdcMode) aspToggleSpeed();
					break;
				}
			}
		}

        usbPoll();

		uartPoll();

    }

    return 0;

}

