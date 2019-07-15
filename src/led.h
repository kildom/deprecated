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

#ifndef led_h
#define led_h

#include "usbdrv.h"

void ledInit(void);
void ledSet(uchar period, uchar phase);
void ledSetFor(uchar for_periods, uchar period, uchar phase);

extern uchar ledTimer;

#define ledPowered()	ledSet(46, 2)
#define ledConfigured()	ledSet(0, 1)
#define ledConnected()  ledSet(23, 22)
#define ledTransfer()   ledSetFor(5, 3, 1)

#endif