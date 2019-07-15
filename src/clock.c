/*
	Copyright (C) 2005
		Thomas Fischl <tfischl@gmx.de>

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

#include <inttypes.h>
#include <avr/io.h>

#include "clock.h"

/* wait time * 320 us */
void clockWait(uint8_t time) {
  
  uint8_t i;
  for (i = 0; i < time; i++) {
    uint8_t starttime = TIMERVALUE;
    while ((uint8_t) (TIMERVALUE - starttime) < CLOCK_T_320us) {}	
  }
}
