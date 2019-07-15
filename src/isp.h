/*
	Copyright (C) 2007, 2008
		Contributed by Thomas Fischl <tfischl@gmx.de>
		Minor modifications by Dominik Kilian <dkilian@op.pl>

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

#ifndef __isp_h_included__
#define	__isp_h_included__

#include "hwconfig.h"

#ifndef uchar
#define	uchar	unsigned char
#endif

#define	ISP_OUT   portPORT(portSpi)
#define ISP_IN    portPIN(portSpi)
#define ISP_DDR   portDDR(portSpi)
#define ISP_RST   bitReset
#define ISP_MOSI  bitMosi
#define ISP_MISO  bitMiso
#define ISP_SCK   bitSck
#define ISP_SS    bitSs

#define ISP_DELAY 1
#define ISP_SCK_SLOW 0
#define ISP_SCK_FAST 1

/* Prepare connection to target device */
void ispConnect();

/* Close connection to target device */
void ispDisconnect();

/* read an write a byte from isp using software (slow) */
uchar ispTransmit_sw(uchar send_byte);

/* read an write a byte from isp using hardware (fast) */
uchar ispTransmit_hw(uchar send_byte);

/* enter programming mode */
uchar ispEnterProgrammingMode();

/* read byte from eeprom at given address */
uchar ispReadEEPROM(unsigned int address);

/* write byte to flash at given address */
uchar ispWriteFlash(unsigned long address, uchar data, uchar pollmode);

uchar ispFlushPage(unsigned long address, uchar pollvalue);

/* read byte from flash at given address */
uchar ispReadFlash(unsigned long address);

/* write byte to eeprom at given address */
uchar ispWriteEEPROM(unsigned int address, uchar data);

/* pointer to sw or hw transmit function */
uchar (*ispTransmit)(uchar);

/* set SCK speed. call before ispConnect! */
void ispSetSCKOption(uchar sckoption);

#endif /* __isp_h_included__ */
