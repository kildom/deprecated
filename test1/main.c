
#include <windows.h>
#include <stdlib.h>
#include <stdio.h>
#include <lusb0_usb.h>

#define MDT printf
//#define MDT(...)

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
		MDT("-bus\n");
        for (dev = bus->devices; dev; dev = dev->next)
        {
			MDT(" -dev\n");
            if (dev->descriptor.idVendor == MY_VID && dev->descriptor.idProduct == MY_PID)
            {
				MDT("  -valid vid pid\n");
				for (c = 0; c < dev->descriptor.bNumConfigurations; c++) {
					// Wszystkie konfiguracje
					struct usb_config_descriptor* conf = &dev->config[c];
					MDT("   -conf\n");
					for (i = 0; i < conf->bNumInterfaces; i++) {
						// Wszystkie interfacy
						struct usb_interface *inter = &conf->interface[i];
						MDT("    -inter\n");
						for (a = 0; a < inter->num_altsetting; a++) {
							// Wszystkie altsettings
							struct usb_interface_descriptor *alt = &inter->altsetting[a];
							MDT("     -altset\n");
							// Pomiñ interfacy nie Mouse
							if (alt->bInterfaceClass != USB_CLASS_HID
								|| alt->bInterfaceSubClass != USB_SUBCLASS_BOOT_INTERFACE
								|| alt->bInterfaceProtocol != USB_PROTOCOL_MOUSE) continue;

							MDT("     -class subclass proto OK\n");

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

							MDT("     -endpoint finded\n");

							device = usb_open(dev);
							if (!device) continue;

							MDT("     -device opened\n");

							r = usb_set_configuration(device, dev->config[c].bConfigurationValue);
							if (r < 0) return 0;

							MDT("     -configuration done\n");

							r = usb_claim_interface(device, alt->bInterfaceNumber);
							if (r < 0) return 0;
							interfaceIndex = i;
							interfaceNumber = alt->bInterfaceNumber;

							MDT("     -interface claimed\n------device READY\n");

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
	INPUT input;
	DWORD oldt, t;
	int del;

	oldbtn = -1;

	memset(&input, 0, sizeof(input));
	input.type = INPUT_MOUSE;
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
			r = usb_interrupt_read(device, endpoint, buf, sizeof(buf), 10000);
		} while (r == -116);

		if (r < 0) {
			MDT("ERROR %d\n", r);
			break;
		}
		if (r != 5) {
			MDT("\ncustom %d: %x %x %x\n", r, buf[0], buf[1], buf[2]);
			continue;
		}
		btn = (unsigned char)buf[0];
		x = buf[1];
		y = buf[2];
		w = buf[3];
		if (x == 0 && y == 0 && w == 0 && btn == oldbtn) continue;

		MDT("packet %d %dx%d, %d\n", btn, x, y, w);

		input.mi.dx = x;
		input.mi.dy = y;
		input.mi.mouseData = w * WHEEL_DELTA;
		input.mi.dwFlags = 0;
		if (x != 0 || y != 0) input.mi.dwFlags |= MOUSEEVENTF_MOVE;
		if (w != 0) input.mi.dwFlags |= MOUSEEVENTF_WHEEL;
		if ((btn&1) && !(oldbtn&1)) input.mi.dwFlags |= MOUSEEVENTF_LEFTDOWN;
		if (!(btn&1) && (oldbtn&1)) input.mi.dwFlags |= MOUSEEVENTF_LEFTUP;
		if ((btn&2) && !(oldbtn&2)) input.mi.dwFlags |= MOUSEEVENTF_RIGHTDOWN;
		if (!(btn&2) && (oldbtn&2)) input.mi.dwFlags |= MOUSEEVENTF_RIGHTUP;
		if ((btn&4) && !(oldbtn&4)) input.mi.dwFlags |= MOUSEEVENTF_MIDDLEDOWN;
		if (!(btn&4) && (oldbtn&4)) input.mi.dwFlags |= MOUSEEVENTF_MIDDLEUP;

		oldbtn = btn;

		SendInput(1, &input, sizeof(input));

	} while (1);
}

#include <Ntsecapi.h>
#include <Wtsapi32.h>

// The following constant may be defined by including NtStatus.h.
#define STATUS_SUCCESS ((NTSTATUS)0x00000000L)

void GetSessionData(PLUID id)
{
	PSECURITY_LOGON_SESSION_DATA data;
	BOOL ok;

	NTSTATUS retval = LsaGetLogonSessionData(id, &data);

	if (retval != STATUS_SUCCESS) {
		wprintf(L"LsaGetLogonSessionData failed %lu\n\n\n\n", LsaNtStatusToWinError(retval));
		return;
	}

	wprintf(L"Size: %d\n", data->Size);
	wprintf(L"LogonId: %8x:%8x\n", data->LogonId.HighPart, data->LogonId.LowPart);
	wprintf(L"UserName: %s\n", data->UserName.Buffer);
	wprintf(L"LogonDomain: %s\n", data->LogonDomain.Buffer);
	wprintf(L"AuthenticationPackage: %s\n", data->AuthenticationPackage.Buffer);
	wprintf(L"LogonType: %d\n", data->LogonType);
	wprintf(L"Session: %d\n", data->Session);
	wprintf(L"Sid: %8x\n", (int)data->Sid);
	wprintf(L"LogonTime: %d\n", (int)(data->LogonTime.QuadPart / 1000LL));
	wprintf(L"LogonServer: %s\n", data->LogonServer.Buffer);
	wprintf(L"DnsDomainName: %s\n", data->DnsDomainName.Buffer);
	wprintf(L"Upn: %s\n", data->Upn.Buffer);

	if (data->Session) {
		HANDLE token;
		ok = WTSQueryUserToken(data->Session, &token);
		if (ok) {
			printf("Token: %d\n", (int)token);
			CloseHandle(token);
		} else {
			printf("Token invalid\n");
		}
	}

	printf("\n\n\n");

	LsaFreeReturnBuffer(data);
}

int _cdecl smmain()
{
  PLUID sessions;
  ULONG count;
  NTSTATUS retval;
  int i;

  retval = LsaEnumerateLogonSessions(&count, &sessions);

  if (retval != STATUS_SUCCESS) {
     wprintf (L"LsaEnumerate failed %lu\n",
       LsaNtStatusToWinError(retval));
    return 1;
  } 
  wprintf (L"Enumerate sessions received %lu sessions.\n", count);

  // Process the array of session LUIDs...
  for (i =0;i < (int) count; i++) {
    GetSessionData (&sessions[i]);
  }

  // Free the array of session LUIDs allocated by the LSA.
  LsaFreeReturnBuffer(sessions);
  return 0;
}

int main()
{

	smmain();
	return;

	SetPriorityClass(GetCurrentProcess(), HIGH_PRIORITY_CLASS);
	SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_TIME_CRITICAL);

	usb_init();

	do {

		if (openDevice()) {
			serveDevice();
		}
		stopDevice();
		Sleep(2000);

	} while (1);

	return 0;
}

