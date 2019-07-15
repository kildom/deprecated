/*
	Copyright (C) 2007, 2008
		Contributed by Thomas Fischl <tfischl@gmx.de>
		Modifications by Dominik Kilian <dkilian@op.pl>

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
#include <avr/eeprom.h>
#include <avr/wdt.h>
#include <util/delay.h>

#include "usbdrv.h"
#include "usbcontrol.h"
#include "led.h"
#include "asp.h"
#include "isp.h"

uchar aspSlowClock;

static uchar EEMEM eeSlowClock;

void aspInit(void)
{
	aspSlowClock = eeprom_read_byte(&eeSlowClock);
}

void aspToggleSpeed(void)
{
	aspSlowClock = !aspSlowClock;
	if (aspSlowClock) {
		ledSetFor(3, 20, 10);
	} else {
		ledSetFor(5, 4, 1);
	}
	eeprom_write_byte(&eeSlowClock, aspSlowClock);
}

//================== FROM USBasp

#define USBASP_FUNC_CONNECT     1
#define USBASP_FUNC_DISCONNECT  2
#define USBASP_FUNC_TRANSMIT    3
#define USBASP_FUNC_READFLASH   4
#define USBASP_FUNC_ENABLEPROG  5
#define USBASP_FUNC_WRITEFLASH  6
#define USBASP_FUNC_READEEPROM  7
#define USBASP_FUNC_WRITEEEPROM 8
#define USBASP_FUNC_SETLONGADDRESS 9

#define PROG_STATE_IDLE         0
#define PROG_STATE_WRITEFLASH   1
#define PROG_STATE_READFLASH    2
#define PROG_STATE_READEEPROM   3
#define PROG_STATE_WRITEEEPROM  4

#define PROG_BLOCKFLAG_FIRST    1
#define PROG_BLOCKFLAG_LAST     2

static uchar replyBuffer[8];

static uchar prog_state = PROG_STATE_IDLE;

static uchar prog_address_newmode = 0;
static unsigned long prog_address;
static unsigned int prog_nbytes = 0;
static unsigned int prog_pagesize;
static uchar prog_blockflags;
static uchar prog_pagecounter;


uchar aspFunctionSetup(void)
{

	uchar* data;
	data = (uchar*)&usbLastRequest;

  uchar len = 0;

  if(data[1] == USBASP_FUNC_CONNECT){

    /* set SCK speed */
    if (aspSlowClock) {
      ispSetSCKOption(ISP_SCK_SLOW);
    } else {
      ispSetSCKOption(ISP_SCK_FAST);
    }

    /* set compatibility mode of address delivering */
    prog_address_newmode = 0;

    ispConnect();
	ledConnected();

  } else if (data[1] == USBASP_FUNC_DISCONNECT) {
    ispDisconnect();
	ledConfigured();

  } else if (data[1] == USBASP_FUNC_TRANSMIT) {
    replyBuffer[0] = ispTransmit(data[2]);
    replyBuffer[1] = ispTransmit(data[3]);
    replyBuffer[2] = ispTransmit(data[4]);
    replyBuffer[3] = ispTransmit(data[5]);
    len = 4;

  } else if (data[1] == USBASP_FUNC_READFLASH) {
    
    if (!prog_address_newmode)
      prog_address = (data[3] << 8) | data[2];
    
    prog_nbytes = (data[7] << 8) | data[6];
    prog_state = PROG_STATE_READFLASH;
    len = 0xff; /* multiple in */

  } else if (data[1] == USBASP_FUNC_READEEPROM) {
    
    if (!prog_address_newmode)
       prog_address = (data[3] << 8) | data[2];

    prog_nbytes = (data[7] << 8) | data[6];
    prog_state = PROG_STATE_READEEPROM;
    len = 0xff; /* multiple in */

  } else if (data[1] == USBASP_FUNC_ENABLEPROG) {
    replyBuffer[0] = ispEnterProgrammingMode();
    len = 1;

  } else if (data[1] == USBASP_FUNC_WRITEFLASH) {

    if (!prog_address_newmode)
      prog_address = (data[3] << 8) | data[2];

    prog_pagesize = data[4];
    prog_blockflags = data[5] & 0x0F;
    prog_pagesize += (((unsigned int)data[5] & 0xF0)<<4);
    if (prog_blockflags & PROG_BLOCKFLAG_FIRST) {
      prog_pagecounter = prog_pagesize;
    }
    prog_nbytes = (data[7] << 8) | data[6];
    prog_state = PROG_STATE_WRITEFLASH;
    len = 0xff; /* multiple out */

  } else if (data[1] == USBASP_FUNC_WRITEEEPROM) {

    if (!prog_address_newmode)
      prog_address = (data[3] << 8) | data[2];

    prog_pagesize = 0;
    prog_blockflags = 0;
    prog_nbytes = (data[7] << 8) | data[6];
    prog_state = PROG_STATE_WRITEEEPROM;
    len = 0xff; /* multiple out */

  } else if(data[1] == USBASP_FUNC_SETLONGADDRESS) {

    /* set new mode of address delivering (ignore address delivered in commands) */
    prog_address_newmode = 1;
    /* set new address */
    prog_address = *((unsigned long*)&data[2]);
  }

  usbMsgPtr = replyBuffer;

  return len;
}


uchar aspFunctionRead(uchar *data, uchar len) {

  uchar i;

  /* check if programmer is in correct read state */
  if ((prog_state != PROG_STATE_READFLASH) &&
      (prog_state != PROG_STATE_READEEPROM)) {
    return 0xff;
  }

  /* fill packet */
  for (i = 0; i < len; i++) {
    if (prog_state == PROG_STATE_READFLASH) {
      data[i] = ispReadFlash(prog_address);
    } else {
      data[i] = ispReadEEPROM(prog_address);
    }
    prog_address++;
  }

  /* last packet? */
  if (len < 8) {
    prog_state = PROG_STATE_IDLE;
  }

  return len;
}


uchar aspFunctionWrite(uchar *data, uchar len) {

  uchar retVal = 0;
  uchar i;

  /* check if programmer is in correct write state */
  if ((prog_state != PROG_STATE_WRITEFLASH) &&
      (prog_state != PROG_STATE_WRITEEEPROM)) {
    return 0xff;
  }


  for (i = 0; i < len; i++) {

    if (prog_state == PROG_STATE_WRITEFLASH) {
      /* Flash */

      if (prog_pagesize == 0) {
	/* not paged */
	ispWriteFlash(prog_address, data[i], 1);
      } else {
	/* paged */
	ispWriteFlash(prog_address, data[i], 0);
	prog_pagecounter --;
	if (prog_pagecounter == 0) {
	  ispFlushPage(prog_address, data[i]);
	  prog_pagecounter = prog_pagesize;
	}
      }

    } else {
      /* EEPROM */
      ispWriteEEPROM(prog_address, data[i]);
    }

    prog_nbytes --;

    if (prog_nbytes == 0) {
      prog_state = PROG_STATE_IDLE;
      if ((prog_blockflags & PROG_BLOCKFLAG_LAST) &&
	  (prog_pagecounter != prog_pagesize)) {

	/* last block and page flush pending, so flush it now */
	ispFlushPage(prog_address, data[i]);
      }
	  
	  retVal = 1; // Need to return 1 when no more data is to be received
    }

    prog_address ++;
  }

  return retVal;
}