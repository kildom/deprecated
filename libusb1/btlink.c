
#include <lusb0_usb.h>

#include "common.h"
#include "hci.h"
#include "btlink.h"

#ifndef ETRANSFER_TIMEDOUT
#define ETRANSFER_TIMEDOUT 116
#endif

// Stan urz¹dzenia: podpiête (BTLINK_OK) / odpiête (BTLINK_DETACHED)
static uint8_t state;

// endpinty USB do przesy³u ró¿nych typów pakietów
//static 
int intrEP;
//static 
int aclInEP;
//static 
int aclOutEP;

// wybrane indeksy (w strukturze usb_device)
static int configIndex;
static int interfaceIndex;
static int altIndex;

// struktura opisuj¹ce wybrane urz¹dzenie
static struct usb_device* deviceData;

// uchwyt do otwartego urz¹dzenia
usb_dev_handle* device;


int8_t btLinkInit()
{
	BTDEBUG(("--- Initializing USB..."));
	usb_init();
	BTDEBUG(("Done\n"));
	state = BTLINK_DETACHED;
	device = 0;
	return BTLINK_DETACHED;
}

int8_t btLinkGetState()
{
	//TODO: Je¿eli siê da, to sprawdzenie, czy urz¹dzenia nadal jest pod³¹czone
	return state;
}

/**
*	Je¿eli nie ma ¿adnego urz¹dzenia pod³¹czonego, to przeszukuje wszystkie
*	urz¹dzenia i pod³ancza wykryte urz¹dzenia Bluetooth.
*/
int8_t btLinkAttach()
{
	struct usb_bus *bus;
	struct usb_device *dev;
	int c, i, a, e, r;

	if (btLinkGetState() == BTLINK_OK)
		return BTLINK_OK;

	usb_find_busses();
	usb_find_devices();

	for (bus = usb_get_busses(); bus; bus = bus->next) for (dev = bus->devices; dev; dev = dev->next) {
		// Wszystkie urz¹dzenia

		if (dev->descriptor.bDeviceClass == USB_CLASS_WIRELESS
			&& dev->descriptor.bDeviceSubClass == USB_SUBCLASS_RF
			&& dev->descriptor.bDeviceProtocol == USB_PROTOCOL_BLUETOOTH)
		{
			// Tylko urz¹dzenia Bluetooth

			for (c = 0; c < dev->descriptor.bNumConfigurations; c++) {
				// Wszystkie konfiguracje

				struct usb_config_descriptor* conf = &dev->config[c];

				for (i = 0; i < conf->bNumInterfaces; i++) {
					// Wszystkie interfacy

					struct usb_interface *inter = &conf->interface[i];

					for (a = 0; a < inter->num_altsetting; a++) {
						// Wszystkie altsettings

						struct usb_interface_descriptor *alt = &inter->altsetting[a];

						// Pomiñ interfacy nie Bluetooth
						if (alt->bInterfaceClass != USB_CLASS_WIRELESS
							|| alt->bInterfaceSubClass != USB_SUBCLASS_RF
							|| alt->bInterfaceProtocol != USB_PROTOCOL_BLUETOOTH
							|| alt->bNumEndpoints != 3) goto nextAltSettings;

						// Dobry interface, wiêc czyœcimy stare dane
						intrEP = 0;
						aclInEP = 0;
						aclOutEP = 0;
						deviceData = 0;
						device = 0;
						configIndex = -1;
						interfaceIndex = -1;
						altIndex = -1;

						for (e = 0; e < alt->bNumEndpoints; e++) {
							// Ka¿dy endpoint
							struct usb_endpoint_descriptor *ep = &alt->endpoint[e];
							if (ep->bEndpointAddress & USB_ENDPOINT_IN) {
								if ((ep->bmAttributes & 0x03) == USB_ENDPOINT_TYPE_INTERRUPT) {
									if (intrEP) goto nextAltSettings;
									intrEP = ep->bEndpointAddress;
								}
								if ((ep->bmAttributes & 0x03) == USB_ENDPOINT_TYPE_BULK) {
									if (aclInEP) goto nextAltSettings;
									aclInEP = ep->bEndpointAddress;
								}
							} else {
								if ((ep->bmAttributes & 0x03) == USB_ENDPOINT_TYPE_BULK) {
									if (aclOutEP) goto nextAltSettings;
									aclOutEP = ep->bEndpointAddress;
								}
							}
						}

						// Pomiñ interfacy nie zgodne z Bluetooth
						if (!intrEP || !aclInEP || !aclOutEP) goto nextAltSettings;

						// Otwieramy urz¹dzenie bluetooth
						device = usb_open(dev);
						if (!device) goto nextDevice;
						deviceData = dev;

						// Wybieramy konfiguracje
						r = usb_set_configuration(device, dev->config[c].bConfigurationValue);
						if (r < 0) goto devError;
						configIndex = c;

						// Rezerwujemy sobie wybrany interface
						r = usb_claim_interface(device, alt->bInterfaceNumber);
						if (r < 0) goto devError;
						interfaceIndex = i;

						// Mówimy urz¹dzeniu, które alternate setting u¿ywamy
						r = usb_set_altinterface(device, alt->bAlternateSetting);
						if (r < 0) goto devError;
						altIndex = a;

						// Urz¹dzenie jest pod³¹czone i gotowe do u¿ytku
						state = BTLINK_OK;
						return BTLINK_OK;

devError:
						// Zwalniamy interface, je¿eli zosta³ zareserwowany
						if (interfaceIndex >= 0) usb_release_interface(device, alt->bInterfaceNumber);
						usb_close(device);
						device = 0;
						goto nextDevice;

nextAltSettings:
						{}
					}
				}
			}
		}
nextDevice:
		{}
	}

	state = BTLINK_DETACHED;
	return BTLINK_DETACHED;
}

int8_t btLinkDetach()
{
	if (device) {
		struct usb_config_descriptor* conf = &deviceData->config[configIndex];
		if (interfaceIndex >= 0) usb_release_interface(device, conf->interface[interfaceIndex].altsetting[altIndex].bInterfaceNumber);
		usb_close(device);
		device = 0;
	}
	state = BTLINK_DETACHED;
	return BTLINK_DETACHED;
}

int16_t btLinkSendCommand(void* buffer)
{
	int r;
	if (state == BTLINK_DETACHED) return BTLINK_DETACHED;
	r = usb_control_msg(device, USB_TYPE_CLASS | USB_RECIP_INTERFACE, 0, 0, 0, (char*)buffer, ((uint8_t*)buffer)[2] + 3, 5000);
	return r >= 0 ? r : (r == -ETRANSFER_TIMEDOUT ? BTLINK_TIMEOUT : BTLINK_UNKNOWN);
}

int16_t btLinkSendAcl(void* buffer)
{
	int r;
	if (state == BTLINK_DETACHED) return BTLINK_DETACHED;
	r = usb_bulk_write(device, aclOutEP, (char*)buffer, ((uint16_t*)buffer)[1] + 4, 5000);
	return r >= 0 ? r : (r == -ETRANSFER_TIMEDOUT ? BTLINK_TIMEOUT : BTLINK_UNKNOWN);
}
