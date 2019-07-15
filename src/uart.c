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

#include <string.h>
#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/pgmspace.h>
#include <avr/wdt.h>
#include <util/delay.h>

#include "usbdrv.h"
#include "main.h"
#include "led.h"
#include "usbcontrol.h"
#include "uart.h"


// Registry mapping for ATmega8
#define UCSR0C_MASK 0
#if defined (__AVR_ATmega8__)
#define UDR0 UDR
#define UCSR0A UCSRA
#define UCSR0B UCSRB
#define UCSR0C UCSRC
#define UBRR0 UBRR
#define UBRR0L UBRRL
#define UBRR0H UBRRH
#define U2X0 U2X
#define UCSZ00 UCSZ0
#define UPM00 UPM0
#define USBS0 USBS
#define RXEN0 RXEN
#define TXEN0 TXEN
#define RXCIE0 RXCIE
#define TXCIE0 TXCIE
#define USART_RX_vect USART_RXC_vect
#define USART_TX_vect USART_TXC_vect
#undef UCSR0C_MASK
#define UCSR0C_MASK 0x80
#endif


#define rq usbLastRequest


/* CDC class requests: */
#define USBRQ_SET_LINE_CODING 0x20
#define USBRQ_GET_LINE_CODING 0x21
#define USBRQ_SET_CONTROL_LINE_STATE 0x22

LineCoding uartLineCoding = { 9600, 0, 0, 8 };

static uchar notifyState = 3;
static uchar sendEmptyFrame = 1;

uchar uartFunctionSetup(void)
{

	if (rq.bRequest == USBRQ_GET_LINE_CODING || rq.bRequest == USBRQ_SET_LINE_CODING) {
		return 0xff;
	} else if (rq.bRequest == USBRQ_SET_CONTROL_LINE_STATE) {
		if (rq.wValue.bytes[0] & 1) {
			notifyState = 2;
		}
	}

	return 0;

}

uchar uartFunctionRead(uchar *data, uchar len) 
{
	if (rq.bRequest == USBRQ_GET_LINE_CODING) {
		memcpy(data, (void*)&uartLineCoding, 7);
		return 7;
	}
	return 0;
}

uchar uartFunctionWrite(uchar *data, uchar len)
{
	if (rq.bRequest == USBRQ_SET_LINE_CODING) {
		USB_SET_DATATOKEN1(USBPID_DATA1);
		sendEmptyFrame = 1;
		if (((LineCoding*)data)->dataRate == 0) {
			uartClose();
		} else {
			memcpy((void*)&uartLineCoding, data, 7);
			uartInit();
		}
	}
	return 1;
}

ISR(USART_RX_vect, ISR_NAKED)
{

	//outBufPush(UDR0);

	asm volatile (
		// zarezerwuj rejestry
		"push	r25\n"
		"push	r24\n"
		"push	r1\n"

		// zapamiêtaj SREG
		"in		r1, 0x3f\n"

		// za³aduj odczytany bajt
		"lds	r25, %0\n"

		// przesun wskaŸnik - zarezerwuj miejsce w buforze
		"lds	r24, outBufPushPos\n"
		"subi	r24, 0xFF	; 255\n"
		"sts	outBufPushPos, r24\n"

		// pozwul wykonywaæ przerwania (po 17 taktach)
		"sei	\n"

		// zarezerwuj dodatkowe rejestry
		"push	r30\n"
		"push	r31\n"

		// zapisz dane do bufora
		"ldi	r30, lo8(outBuf)\n"
		"ldi	r31, hi8(outBuf)\n"
		"subi	r24, 1\n"
		"neg	r31\n"
		"add	r30, r24\n"
		"sbci	r31, 0\n"
		"neg	r31\n"
		"st		Z, r25\n"

		// przywróæ pocz¹tkowy stan
		"pop	r31\n"
		"pop	r30\n"
		"out	0x3f, r1	; 63\n"
		"pop	r1\n"
		"pop	r24\n"
		"pop	r25\n"
		"reti\n" ::
		"M" (_SFR_MEM_ADDR(UDR0))
		);

}

static volatile uchar txComp;

ISR(USART_TX_vect, ISR_NOBLOCK)
{
	if (inBufLength()) {
		cli();
		UDR0 = inBufPop();
		if (usbAllRequestsAreDisabled() && inBufLeft() >= 32)
			usbEnableAllRequests();
		sei();
	} else {
		txComp = 1;
	}
}

void uartData(void)
{
	
	if (txComp) {
		if (inBufLength()) {
			txComp = 0;
			cli();
			UDR0  = inBufPop();
			if (usbAllRequestsAreDisabled() && inBufLeft() >= 32)
				usbEnableAllRequests();
			sei();
		}
	}
	
}

void uartInit(void)
{

	txComp = 1;

	portPORT(portUART) |= (1 << bitTxD) | (1 << bitRxD);
	portDDR(portUART) &= ~(1 << bitRxD);
	portDDR(portUART) |= (1 << bitTxD);

	unsigned long b = uartLineCoding.dataRate;
	unsigned int u = (unsigned long)(((F_CPU/8) + (b>>1)) / b);
	u -= 1;
	if (u > 4095)
		u = 4095;
	UBRR0L = u & 0xFF;
	UBRR0H = u >> 8;

	UCSR0A = (1 << U2X0);

	uchar db = uartLineCoding.dataBits - 5;
	if (db>3) db = 3;
	UCSR0C = (db << UCSZ00) | UCSR0C_MASK;

	if (uartLineCoding.parityType == 1) {
		UCSR0C |= 3 << UPM00;
	} else if (uartLineCoding.parityType == 2) {
		UCSR0C |= 2 << UPM00;
	}

	if (uartLineCoding.stopBit > 0) {
		UCSR0C |= 1 << USBS0;
	}

	UCSR0B = (1 << RXEN0) | (1 << TXEN0) | (1 << RXCIE0) | (1 << TXCIE0);

}

void uartClose(void)
{
	UCSR0B = 0;
	portDDR(portUART) &= ~((1 << bitRxD) | (1 << bitTxD));
	portPORT(portUART) &= ~((1 << bitRxD) | (1 << bitTxD));
	inBufReset();
	outBufReset();
}

void uartFunctionWriteOut(uchar *data, uchar len)
{
    do {
		inBufPush(*data++);
    } while(--len);
	uartData();
	ledTransfer();
	if (inBufLeft() < 32)
		usbDisableAllRequests();
}


void uartPoll(void)
{

	if (usbInterruptIsReady()) {

		static uchar buffer[8];

		uchar i = 0;
		while (i < 8 && outBufLength()) {
			buffer[i++] = outBufPop();
		}
		if (i > 0 || sendEmptyFrame) {
			sendEmptyFrame = i;
			usbSetInterrupt(buffer, i);
			ledTransfer();
		}

	}

	if (cdcMode && notifyState && usbInterruptIsReady3()) {

		static uchar notification[] = {0xa1, 0x20, 0, 0, 0, 0, 2, 0};
		static uchar notificationData[] = {3, 0};

		if (notifyState == 3) {
			usbSetInterrupt3(notification, 0);
			notifyState = 1;
		} else if (notifyState == 2) {
			usbSetInterrupt3(notification, sizeof(notification));
		} else {
			usbSetInterrupt3(notificationData, sizeof(notificationData));
		}

		notifyState--;

	}

	uartData();

}
