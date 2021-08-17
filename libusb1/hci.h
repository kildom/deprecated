#ifndef _hci_h_
#define _hci_h_

#include "common.h"

// USB Bluetooth Classes
#ifndef USB_CLASS_WIRELESS
#define USB_CLASS_WIRELESS 0xE0
#endif
#ifndef USB_SUBCLASS_RF
#define USB_SUBCLASS_RF 0x01
#endif
#ifndef USB_PROTOCOL_BLUETOOTH
#define USB_PROTOCOL_BLUETOOTH 0x01
#endif

#define HCI_MAKEOPCODE(ocf, ogf) ((ocf) | ((ogf) << 10))
#define HCI_PACKET_START uint16_t opcode; uint8_t length
#define HCI_PREPARE_PACKET(type, var) { (var).opcode = type##_OP; (var).length = sizeof(struct type) - 3; }

#include "mypushpack.h"

// ================================= 7.1 LINK CONTROL COMMANDS
#define HCI_OGF_LINK_CONTROL 0x01


// ================================= 7.2 LINK POLICY COMMANDS
#define HCI_OGF_LINK_POLICY 0x02


// ================================= 7.3 CONTROLLER & BASEBAND COMMANDS
#define HCI_OGF_CONTROLLER_AND_BASEBAND 0x03

// ==== 7.3.2 Reset Command
#define HCI_Reset_OP HCI_MAKEOPCODE(0x0003, HCI_OGF_CONTROLLER_AND_BASEBAND)
struct HCI_Reset
{
	HCI_PACKET_START;
} PACKED;

// ================================= 7.4 INFORMATIONAL PARAMETERS
#define HCI_OGF_INFORMATIONAL 0x04

// ==== 7.4.5 Read Buffer Size Command
#define HCI_Read_Buffer_Size_OP HCI_MAKEOPCODE(0x0005, HCI_OGF_INFORMATIONAL)
struct HCI_Read_Buffer_Size
{
	HCI_PACKET_START;
} PACKED;


// ================================= 7.5 STATUS PARAMETERS
#define HCI_OGF_STATUS 0x05


// ================================= 7.6 TESTING COMMANDS
#define HCI_OGF_TESTING 0x06


#include "mypoppack.h"


#endif
