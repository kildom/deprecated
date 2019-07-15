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

#include <stdlib.h>
#include <string.h>
#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/pgmspace.h>
#include <avr/wdt.h>
#include <util/delay.h>

#include "usbdrv.h"
#include "main.h"
#include "led.h"
#include "buffers.h"
#include "uart.h"
#include "asp.h"
#include "usbcontrol.h"


usbRequest_t usbLastRequest;

uchar usbFunctionSetup(uchar data[8])
{

	memcpy(&usbLastRequest, data, 8);

	ledTransfer();

    if ((usbLastRequest.bmRequestType & USBRQ_TYPE_MASK) == USBRQ_TYPE_CLASS) {  // CDC Requests (class only) 
		return uartFunctionSetup();
	} else {  // must be Vendor Request (USBasp)
		return aspFunctionSetup();
	}

}

uchar usbFunctionRead(uchar *data, uchar len)
{
    if ((usbLastRequest.bmRequestType & USBRQ_TYPE_MASK) == USBRQ_TYPE_CLASS) {  // CDC Requests (class only) 
		return uartFunctionRead(data, len);
	} else {  // must be Vendor Request (USBasp)
		return aspFunctionRead(data, len);
	}
}


uchar usbFunctionWrite(uchar *data, uchar len)
{
    if ((usbLastRequest.bmRequestType & USBRQ_TYPE_MASK) == USBRQ_TYPE_CLASS) {  // CDC Requests (class only) 
		return uartFunctionWrite(data, len);
	} else {  // must be Vendor Request (USBasp)
		return aspFunctionWrite(data, len);
	}
}



void usbFunctionWriteOut(uchar *data, uchar len)
{
	uartFunctionWriteOut(data, len);
}



#pragma region Descriptors

static PROGMEM char cdcDescriptorDevice[] = {    /* USB device descriptor */
    18,         /* sizeof(usbDescriptorDevice): length of descriptor in bytes */
    USBDESCR_DEVICE,        /* descriptor type */
    0x10, 0x01,             /* USB version supported */
    0x02,                   /* device class: CDC */
    0,                      /* subclass */
    0,                      /* protocol */
    8,                      /* max packet size */
    0xc0, 0x16,             /* 2 bytes */
    0xe1, 0x05,             /* 2 bytes: shared PID for CDC-ACM devices */
    0x00, 0x01,             /* 2 bytes Version number of the device*/
    1,                      /* manufacturer string index */
    2,                      /* product string index */
    0,                      /* serial number string index */
    1,                      /* number of configurations */
};

static PROGMEM char cdcDescriptorConfig[] = {   /* USB configuration descriptor */
    9,          /* sizeof(usbDescriptorConfiguration): length of descriptor in bytes */
    USBDESCR_CONFIG,    /* descriptor type */
    67, 0,      /* total length of data returned (including inlined descriptors) */
    2,          /* number of interfaces in this configuration */
    1,          /* index of this configuration */
    0,          /* configuration name string index */
    USBATTR_BUSPOWER,   /* attributes */
    200/2,            /* max USB current in 2mA units */

    /* interface descriptors follow inline: */
    /* Interface Descriptor for CDC-ACM Control  */
    9,          /* sizeof(usbDescrInterface): length of descriptor in bytes */
    USBDESCR_INTERFACE, /* descriptor type */
    0,          /* index of this interface */
    0,          /* alternate setting for this interface */
    1,          /* endpoints excl 0: number of endpoint descriptors to follow */
    0x02,       /* CDC class */
    2,          /* Abstract (Modem) */
    1,          /* AT-Commands */
    0,          /* string index for interface */

    /* CDC Class-Specific descriptors */
    5,          /* sizeof(usbDescrCDC_HeaderFn): length of descriptor in bytes */
    0x24,       /* descriptor type */
    0,          /* Subtype: header functional descriptor */
    0x10, 0x01, /* CDC spec release number in BCD */

    4,          /* sizeof(usbDescrCDC_AcmFn): length of descriptor in bytes */
    0x24,       /* descriptor type */
    2,          /* Subtype: abstract control management functional descriptor */
    0x02,       /* capabilities: USBRQ_SET_LINE_CODING, USBRQ_GET_LINE_CODING, USBRQ_SET_CONTROL_LINE_STATE */

    5,          /* sizeof(usbDescrCDC_UnionFn): length of descriptor in bytes */
    0x24,       /* descriptor type */
    6,          /* Subtype: union functional descriptor */
    0,          /* CDC_COMM_INTF_ID: master interface (control) */
    1,          /* CDC_DATA_INTF_ID: slave interface (data) */

    5,          /* sizeof(usbDescrCDC_CallMgtFn): length of descriptor in bytes */
    0x24,       /* descriptor type */
    1,          /* Subtype: call management functional descriptor */
    0x03,       /* capabilities: allows management on data interface, handles call management by itself */
    1,          /* CDC_DATA_INTF_ID: interface used for call management */

    /* Endpoint Descriptor */
    7,          /* sizeof(usbDescrEndpoint) */
    USBDESCR_ENDPOINT,  /* descriptor type = endpoint */
    0x83,       /* IN endpoint number 3 */
    0x03,       /* attrib: Interrupt endpoint */
    8, 0,       /* maximum packet size */
    100,        /* in ms */

    /* Interface Descriptor for CDC-ACM Data  */
    9,          /* sizeof(usbDescrInterface): length of descriptor in bytes */
    USBDESCR_INTERFACE, /* descriptor type */
    1,          /* index of this interface */
    0,          /* alternate setting for this interface */
    2,          /* endpoints excl 0: number of endpoint descriptors to follow */
    0x0a,       /* Data Interface Class Codes */
    0,          /* interface subclass */
    0,          /* Data Interface Class Protocol Codes */
    0,          /* string index for interface */

    /* Endpoint Descriptor */
    7,          /* sizeof(usbDescrEndpoint) */
    USBDESCR_ENDPOINT,  /* descriptor type = endpoint */
    0x01,       /* OUT endpoint number 1 */
    0x02,       /* attrib: Bulk endpoint */
    8, 0,       /* maximum packet size */
    0,          /* in ms */

    /* Endpoint Descriptor */
    7,          /* sizeof(usbDescrEndpoint) */
    USBDESCR_ENDPOINT,  /* descriptor type = endpoint */
    0x81,       /* IN endpoint number 1 */
    0x02,       /* attrib: Bulk endpoint */
    8, 0,       /* maximum packet size */
    0,          /* in ms */
};

static PROGMEM wchar_t cdcVendorString[16] = L"\x0320" "mmd.zor.webd.pl";
static PROGMEM wchar_t cdcProductString[12] = L"\x0316" "USBaspXCDC";

/* ------------------------------------------------------------------------- */


PROGMEM char aspDescriptorDevice[] = {    /* USB device descriptor */
    18,         /* sizeof(usbDescriptorDevice): length of descriptor in bytes */
    USBDESCR_DEVICE,        /* descriptor type */
    0x10, 0x01,             /* USB version supported */
    0xff,
    0,
    0,                      /* protocol */
    8,                      /* max packet size */
    0xc0, 0x16,             /* 2 bytes */
    0xdc, 0x05,             /* 2 bytes: shared PID for CDC-ACM devices */
    0x00, 0x01,             /* 2 bytes */
    1,         /* manufacturer string index */
    2,        /* product string index */
    0,  /* serial number string index */
    1,          /* number of configurations */
};


PROGMEM char aspDescriptorConfig[] = {    /* USB configuration descriptor */
    9,          /* sizeof(usbDescriptorConfiguration): length of descriptor in bytes */
    USBDESCR_CONFIG,    /* descriptor type */
    32, 0,      /* total length of data returned (including inlined descriptors) */
    1,          /* number of interfaces in this configuration */
    1,          /* index of this configuration */
    0,          /* configuration name string index */
    USBATTR_BUSPOWER, /* attributes */
    200/2,            /* max USB current in 2mA units */

/* interface descriptor follows inline: */
    9,          /* sizeof(usbDescrInterface): length of descriptor in bytes */
    USBDESCR_INTERFACE, /* descriptor type */
    0,          /* index of this interface */
    0,          /* alternate setting for this interface */
    2, /* endpoints excl 0: number of endpoint descriptors to follow */
    0,
    0,
    0,
    0,          /* string index for interface */

    /* Endpoint Descriptor */
    7,          /* sizeof(usbDescrEndpoint) */
    USBDESCR_ENDPOINT,  /* descriptor type = endpoint */
    0x01,       /* OUT endpoint number 1 */
    0x03,       /* attrib: Interrupt endpoint */
    8, 0,       /* maximum packet size */
    0,          /* in ms */

    /* Endpoint Descriptor */
    7,          /* sizeof(usbDescrEndpoint) */
    USBDESCR_ENDPOINT,  /* descriptor type = endpoint */
    0x81,       /* IN endpoint number 1 */
    0x03,       /* attrib: Interrupt endpoint */
    8, 0,       /* maximum packet size */
    0,          /* in ms */
	
};

static PROGMEM wchar_t aspVendorString[14] = L"\x031C" "www.fischl.de";
static PROGMEM wchar_t aspProductString[7] = L"\x030E" "USBasp";

#pragma endregion


uchar usbFunctionDescriptor(usbRequest_t *rq)
{

	if (cdcMode) {

		if (rq->wValue.bytes[1] == USBDESCR_DEVICE) {
			usbMsgPtr = (uchar*)cdcDescriptorDevice;
			return sizeof(cdcDescriptorDevice);
		} else if (rq->wValue.bytes[1] == USBDESCR_CONFIG) {
			ledConfigured();
			usbMsgPtr = (uchar*)cdcDescriptorConfig;
			return sizeof(cdcDescriptorConfig);
		} else {
			if (rq->wValue.bytes[0] == 1) {
				usbMsgPtr = (uchar*)cdcVendorString;
				return sizeof(cdcVendorString);
			} else {
				usbMsgPtr = (uchar*)cdcProductString;
				return sizeof(cdcProductString);
			}
		}

	} else {

		if (rq->wValue.bytes[1] == USBDESCR_DEVICE) {
			usbMsgPtr = (uchar*)aspDescriptorDevice;
			return sizeof(aspDescriptorDevice);
		} else if (rq->wValue.bytes[1] == USBDESCR_CONFIG) {
			ledConfigured();
			usbMsgPtr = (uchar*)aspDescriptorConfig;
			return sizeof(aspDescriptorConfig);
		} else {
			if (rq->wValue.bytes[0] == 1) {
				usbMsgPtr = (uchar*)aspVendorString;
				return sizeof(aspVendorString);
			} else {
				usbMsgPtr = (uchar*)aspProductString;
				return sizeof(aspProductString);
			}
		}
	}

}


