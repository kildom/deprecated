
#include "stdafx.h"
#include "service.h"

#include <windows.h>
#include <Wtsapi32.h>
#include <stdlib.h>
#include <stdio.h>
#include <lusb0_usb.h>

//#define MDT printf
//#define MDT(...)

#define MDTT(x) Log(L##x)
#define MDTF Logf

#ifndef USB_CLASS_HID
#define USB_CLASS_HID 0x03
#endif

#ifndef USB_SUBCLASS_BOOT_INTERFACE
#define USB_SUBCLASS_BOOT_INTERFACE 0x01
#endif

#ifndef USB_PROTOCOL_MOUSE
#define USB_PROTOCOL_MOUSE 0x02
#endif

#define MY_VID 0x09DA //A4Tech
#define MY_PID 0x000A //USB Mouse

usb_dev_handle* device;
int interfaceIndex;
int interfaceNumber;
int endpoint;
int interval;

#define PIPE_NAME L"LibUSBBasedMouseFilterPipe"

DWORD currentSession = 0;
int currentPipeNumber = 1;
HANDLE namedPipe = INVALID_HANDLE_VALUE;


int getTokenLevel(HANDLE token)
{
	TOKEN_ELEVATION_TYPE type;
	DWORD len;
	if (!token) return 0;
	if (!GetTokenInformation(token, TokenElevationType, &type, sizeof(type), &len)) return 1;
	switch (type) 
	{
	case TokenElevationTypeDefault: return 4;
	case TokenElevationTypeFull: return 5;
	case TokenElevationTypeLimited: return 3;
	}
	return 2;
}

void checkUserApp()
{
	BOOL ok;
	HANDLE token1;
	HANDLE token2;
	int level1;
	int level2;
	STARTUPINFO si;
	PROCESS_INFORMATION pi;
	DWORD len;
	wchar buf[4096 + 100];

	DWORD newses = WTSGetActiveConsoleSessionId();
	//Logf(L"Session: %d\n", newses);
	if (newses == 0xFFFFFFFF) newses = 0;
	if (newses == currentSession) return;
	if (newses) {
		ok = WTSQueryUserToken(newses, &token1);
	} else {
		ok = FALSE;
	}
	if (!ok) newses = 0;

	if (currentSession) {
		if (namedPipe != INVALID_HANDLE_VALUE) CloseHandle(namedPipe);
		namedPipe = INVALID_HANDLE_VALUE;
	}

	currentSession = newses;
	if (currentSession == 0) return;

	currentPipeNumber++;
	swprintf(buf, sizeof(buf), L"\\\\.\\pipe\\" PIPE_NAME L"%d", currentPipeNumber);
	
	namedPipe = CreateNamedPipe(buf, PIPE_ACCESS_OUTBOUND, 
		PIPE_TYPE_MESSAGE|PIPE_READMODE_MESSAGE|PIPE_WAIT, PIPE_UNLIMITED_INSTANCES,
		1024, 1024, 1000, 0);

	if (namedPipe == INVALID_HANDLE_VALUE) {
		CloseHandle(token1);
		return;
	}

	level1 = getTokenLevel(token1);

	if (!GetTokenInformation(token1, TokenLinkedToken, &token2, sizeof(token2), &len)) token2 = 0;

	level2 = getTokenLevel(token2);

	Logf(L"user token1: %d\n", (int)token1);
	Logf(L"user token2: %d\n", (int)token2);
	Logf(L"token1 level: %d\n", (int)level1);
	Logf(L"token2 level: %d\n", (int)level2);

	if (level1 > level2) {
		CloseHandle(token2);
	} else {
		CloseHandle(token1);
		token1 = token2;
	}

	wcscpy(buf, ExeName);
	len = wcslen(buf) - 4; //.exe
	if (len > 4096) {
		CloseHandle(token1);
	}

	swprintf(buf + len, sizeof(buf) - len, L"-gui.exe --pipe=\\\\.\\pipe\\" PIPE_NAME L"%d", currentPipeNumber);

	memset(&si, 0, sizeof(si));
	si.cb = sizeof(si);
	if (CreateProcessAsUser(token1, 0, buf, 0, 0, FALSE, 0, 0, L".", &si, &pi)) {
		Log(L"ok CreateProcessAsUser\n");
	} else {
		Log(L"error CreateProcessAsUser\n");
	}
	CloseHandle(token1);
}


int openDevice()
{

    struct usb_bus *bus;
    struct usb_device *dev;
	int c, i, a, e, r;

	device = 0;
	interfaceIndex = -1;
	interfaceNumber = -1;
	endpoint = -1;

	usb_find_busses(); /* find all busses */
	usb_find_devices(); /* find all connected devices */

    for (bus = usb_get_busses(); bus; bus = bus->next)
    {
		MDTT("-bus\n");
        for (dev = bus->devices; dev; dev = dev->next)
        {
			MDTT(" -dev\n");
            if (dev->descriptor.idVendor == MY_VID && dev->descriptor.idProduct == MY_PID)
            {
				MDTT("  -valid vid pid\n");
				for (c = 0; c < dev->descriptor.bNumConfigurations; c++) {
					// Wszystkie konfiguracje
					struct usb_config_descriptor* conf = &dev->config[c];
					MDTT("   -conf\n");
					for (i = 0; i < conf->bNumInterfaces; i++) {
						// Wszystkie interfacy
						struct usb_interface *inter = &conf->interface[i];
						MDTT("    -inter\n");
						for (a = 0; a < inter->num_altsetting; a++) {
							// Wszystkie altsettings
							struct usb_interface_descriptor *alt = &inter->altsetting[a];
							MDTT("     -altset\n");
							// Pomiñ interfacy nie Mouse
							if (alt->bInterfaceClass != USB_CLASS_HID
								|| alt->bInterfaceSubClass != USB_SUBCLASS_BOOT_INTERFACE
								|| alt->bInterfaceProtocol != USB_PROTOCOL_MOUSE) continue;

							MDTT("     -class subclass proto OK\n");

							for (e = 0; e < alt->bNumEndpoints; e++) {
								// Ka¿dy endpoint
								struct usb_endpoint_descriptor *ep = &alt->endpoint[e];
								if (ep->bEndpointAddress & USB_ENDPOINT_IN) {
									if ((ep->bmAttributes & 0x03) == USB_ENDPOINT_TYPE_INTERRUPT) {
										endpoint = ep->bEndpointAddress;
										interval = ep->bInterval;
										if (interval < 1) interval = 1;
									}
								}
							}
							if (endpoint < 0) continue;

							MDTT("     -endpoint finded\n");

							device = usb_open(dev);
							if (!device) continue;

							MDTT("     -device opened\n");

							r = usb_set_configuration(device, dev->config[c].bConfigurationValue);
							if (r < 0) return 0;

							MDTT("     -configuration done\n");

							r = usb_claim_interface(device, alt->bInterfaceNumber);
							if (r < 0) return 0;
							interfaceIndex = i;
							interfaceNumber = alt->bInterfaceNumber;

							MDTT("     -interface claimed\n------device READY\n");

							return 1;
						}
					}
				}
            }
        }
	}

	return 0;
}


void stopDevice()
{

	if (interfaceNumber >= 0) usb_release_interface(device, interfaceNumber);
	if (device) usb_close(device);

	interfaceNumber = -1;
	interfaceIndex = -1;
	device = 0;

}


void serveDevice()
{
	int r, x, y, w, btn, oldbtn;
	signed char desc[64];
	signed char buf[5];
	DWORD oldt, t;
	int del;

	oldbtn = -1;

	oldt = 0;

	usb_get_descriptor(device, 0x22, 0x00, desc, sizeof(desc));

	do {

		t = GetTickCount();
		del = t - oldt;
		oldt = t;
		if (del < interval) {
			Sleep(interval - del);
		}

		do {
			checkUserApp();
			r = usb_interrupt_read(device, endpoint, (char*)buf, sizeof(buf), 1000);
			if (!ServiceRunning()) return;
		} while (r == -116);

		if (r < 0) {
			MDTF(L"ERROR %d\n", r);
			break;
		}
		if (r != 5) {
			MDTF(L"\ncustom %d: %x %x %x\n", r, buf[0], buf[1], buf[2]);
			continue;
		}
		btn = (unsigned char)buf[0];
		x = buf[1];
		y = buf[2];
		w = buf[3];
		if (x == 0 && y == 0 && w == 0 && btn == oldbtn) continue;

		MDTF(L"packet %d %dx%d, %d\n", btn, x, y, w);

		if (namedPipe != INVALID_HANDLE_VALUE) {
			DWORD len;
			WriteFile(namedPipe, buf, 4, &len, 0);
		}

		oldbtn = btn;

	} while (ServiceRunning());

}



int ServiceMain(void)
{

	SetPriorityClass(GetCurrentProcess(), HIGH_PRIORITY_CLASS);
	SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_TIME_CRITICAL);

	usb_init();

	do {

		if (openDevice()) {
			serveDevice();
		}
		stopDevice();
		if (!ServiceRunning()) break;
		Sleep(2000);

	} while (ServiceRunning());

	if (namedPipe != INVALID_HANDLE_VALUE) CloseHandle(namedPipe);

	return 0;
}


