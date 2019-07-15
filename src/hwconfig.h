
#ifndef hwconfig_h
#define hwconfig_h


/* ===================== Connections on PCB ===================== */

// USB connection. See usbconfig.h, section "Hardware Config" for more details.
#define portUSB       D
#define bitDPlus      2
#define bitDMinus     6

// Status LED
#define portLed       C
#define bitLed        0

// Mode Switch
#define portSwitch    D
#define bitSwitch     5

// ISP Interface
#define portSpi       B   // const
#define bitReset      0
#define bitSck        5   // const
#define bitMiso       4   // const
#define bitMosi       3   // const
#define bitSs         2   // const

// UART Interface
#define portUART      D   // const
#define bitTxD        1   // const
#define bitRxD        0   // const

/*
Standard configurations:

	USBaspX:
		D+		PD2
		D-		PD6
		LED		PC0
		SW		PD5
		RST		PB0

	Orginal USBasp:
		D+		PB1
		D-		PB0
		LED		PC0
		SW		PC2
		RST		PB2

	Not common PCB:
		D+		PD2
		D-		PD4
		LED		PC0
		SW		PB0
		RST		PB1

*/



/* ============================================================== */


/* Some macros */
#define macroConcat(a, b) a ## b
#define portDDR(name) macroConcat(DDR, name)
#define portPORT(name) macroConcat(PORT, name)
#define portPIN(name) macroConcat(PIN, name)
#ifndef uchar
#define uchar unsigned char
#endif


#endif
