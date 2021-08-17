
#include <stdio.h>

#include <lusb0_usb.h>

#include "hci.h"
#include "btlink.h"

extern int intrEP;
extern int aclInEP;
extern int aclOutEP;

extern usb_dev_handle* device;

static 
int testBluetooth()
{
	int r;
	char buffer[512];
	union {
		struct HCI_Reset reset;
		struct HCI_Read_Buffer_Size gsize;
	} buf;

	HCI_PREPARE_PACKET(HCI_Reset, buf.reset);
	r = btLinkSendCommand(&buf);
	if (r < 0) return 0;
	do {
		r = usb_interrupt_read(device, intrEP, buffer, sizeof(buffer), 1000);
	} while (r >= 0);

	HCI_PREPARE_PACKET(HCI_Read_Buffer_Size, buf.gsize);
	r = btLinkSendCommand(&buf);
	if (r < 0) return 0;
	do {
		r = usb_interrupt_read(device, intrEP, buffer, sizeof(buffer), 1000);
	} while (r >= 0);
	return 1;
}


int main()
{

	btLinkInit();

	btLinkAttach();

	testBluetooth();

	return 0;

}
