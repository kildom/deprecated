EESchema Schematic File Version 2
LIBS:power,device,transistors,conn,linear,regul,74xx,cmos4000,adc-dac,memory,xilinx,special,microcontrollers,dsp,microchip,analog_switches,motorola,texas,intel,audio,interface,digital-audio,philips,display,cypress,siliconi,contrib,valves,.\pcb.cache
EELAYER 24  0
EELAYER END
$Descr A4 11700 8267
Sheet 1 1
Title "USBaspX"
Date "27 nov 2008"
Rev "0.2"
Comp "Dominik Kilian"
Comment1 ""
Comment2 ""
Comment3 ""
Comment4 ""
$EndDescr
Wire Wire Line
	6750 2500 6050 2500
Wire Wire Line
	6050 4200 6300 4200
Wire Wire Line
	7400 3200 7900 3200
Wire Wire Line
	7900 3200 7900 4100
Wire Wire Line
	7900 4100 6050 4100
Wire Wire Line
	7500 2800 7500 3000
Wire Wire Line
	7500 3000 7400 3000
Wire Wire Line
	6550 3100 6550 2200
Wire Wire Line
	6550 3100 6800 3100
Wire Wire Line
	6600 4500 6600 5000
Wire Wire Line
	7400 2900 7600 2900
Wire Wire Line
	7600 2900 7600 4800
Connection ~ 6600 4500
Wire Wire Line
	3750 3800 4150 3800
Wire Wire Line
	4150 3800 4150 3600
Wire Wire Line
	6050 2500 6050 2700
Wire Wire Line
	7650 2400 7650 2500
Wire Wire Line
	5100 5550 5200 5550
Wire Wire Line
	5200 5550 5200 5450
Wire Wire Line
	4250 5450 4250 5550
Wire Wire Line
	4250 5550 4300 5550
Connection ~ 5550 6150
Wire Wire Line
	5650 5950 5550 5950
Wire Wire Line
	5550 5950 5550 6300
Wire Wire Line
	6050 5950 6200 5950
Wire Wire Line
	6850 3700 6050 3700
Wire Wire Line
	7600 5000 7800 5000
Wire Wire Line
	7800 5000 7800 3600
Wire Wire Line
	6050 4900 6500 4900
Wire Wire Line
	6500 4900 6500 5200
Wire Wire Line
	6500 5200 6800 5200
Wire Wire Line
	6050 3800 6200 3800
Wire Wire Line
	6300 5650 6650 5650
Wire Wire Line
	7800 3600 6050 3600
Wire Wire Line
	4150 2700 4150 2200
Wire Wire Line
	7750 5500 7750 5400
Wire Wire Line
	7750 5400 6650 5400
Wire Wire Line
	6650 5400 6650 5550
Connection ~ 7550 5550
Wire Wire Line
	7400 5550 7550 5550
Wire Wire Line
	7750 5800 7400 5800
Wire Wire Line
	3850 3100 4150 3100
Wire Wire Line
	4050 3950 4050 3900
Wire Wire Line
	4050 3900 4150 3900
Wire Wire Line
	3350 4150 3350 3200
Connection ~ 3850 3200
Connection ~ 3850 3800
Wire Wire Line
	3850 4100 4150 4100
Wire Wire Line
	4150 2900 4000 2900
Wire Wire Line
	4000 2900 4000 2950
Wire Wire Line
	7400 5650 7550 5650
Connection ~ 7550 5650
Connection ~ 7550 5400
Connection ~ 6650 5400
Wire Wire Line
	7550 5650 7550 5400
Wire Wire Line
	6650 5800 6200 5800
Wire Wire Line
	6050 5000 6400 5000
Wire Wire Line
	6400 5000 6400 5100
Wire Wire Line
	6400 5100 6800 5100
Wire Wire Line
	6600 5000 6800 5000
Wire Wire Line
	6800 4800 6050 4800
Wire Wire Line
	7600 4900 7700 4900
Wire Wire Line
	7700 4900 7700 3700
Wire Wire Line
	7600 5300 7600 5100
Wire Wire Line
	7700 3700 7350 3700
Wire Wire Line
	6200 6150 6300 6150
Connection ~ 6300 5650
Wire Wire Line
	5550 6150 5800 6150
Wire Wire Line
	7750 6300 7750 6500
Wire Wire Line
	7750 6500 6300 6500
Connection ~ 6300 6150
Wire Wire Line
	5200 5950 5200 6100
Wire Wire Line
	3750 3200 4150 3200
Wire Wire Line
	4150 3200 4150 3400
Wire Wire Line
	6200 5950 6200 5750
Connection ~ 6200 5800
Wire Wire Line
	6300 6500 6300 5550
Wire Wire Line
	6200 3800 6200 5250
Connection ~ 5200 5550
Connection ~ 7750 5800
Connection ~ 3350 3800
Connection ~ 7600 5200
Wire Wire Line
	6050 4500 7500 4500
Wire Wire Line
	7500 4500 7500 3100
Wire Wire Line
	7500 3100 7400 3100
Wire Wire Line
	4150 2200 6550 2200
Wire Wire Line
	6700 2900 6800 2900
Wire Wire Line
	6800 3000 6700 3000
Wire Wire Line
	6700 3000 6700 2800
Connection ~ 6700 2900
Wire Wire Line
	6800 3200 6600 3200
Wire Wire Line
	6600 3200 6600 3300
Wire Wire Line
	6300 4200 6300 5050
$Comp
L CAPAPOL C3
U 1 1 49306BED
P 5200 5750
F 0 "C3" H 5250 5850 50  0000 L C
F 1 "4u7" H 5250 5650 50  0000 L C
	1    5200 5750
	1    0    0    -1  
$EndComp
$Comp
L CRYSTAL X1
U 1 1 49300735
P 3850 3500
F 0 "X1" H 3850 3350 60  0000 C C
F 1 "12MHz" H 3850 3650 60  0000 C C
	1    3850 3500
	0    1    1    0   
$EndComp
Text Notes 4950 5450 0    60   ~
*
Text Notes 3400 6200 0    60   ~
  low-drop 3V3 regulator
Text Notes 4550 5450 0    60   ~
*
Text Notes 3400 6100 0    60   ~
* Can be replaced by
$Comp
L +5V #PWR01
U 1 1 492F1733
P 7650 2400
F 0 "#PWR01" H 7650 2490 20  0001 C C
F 1 "+5V" H 7650 2490 30  0000 C C
	1    7650 2400
	1    0    0    -1  
$EndComp
$Comp
L R R2
U 1 1 492F1726
P 7000 2500
F 0 "R2" V 7080 2500 50  0000 C C
F 1 "680" V 7000 2500 50  0000 C C
	1    7000 2500
	0    1    1    0   
$EndComp
$Comp
L LED DS1
U 1 1 492F1714
P 7450 2500
F 0 "DS1" H 7450 2600 50  0000 C C
F 1 "LED" H 7450 2400 50  0000 C C
	1    7450 2500
	-1   0    0    1   
$EndComp
$Comp
L GND #PWR02
U 1 1 492F14A4
P 5200 6100
F 0 "#PWR02" H 5200 6100 30  0001 C C
F 1 "GND" H 5200 6030 30  0001 C C
	1    5200 6100
	1    0    0    -1  
$EndComp
$Comp
L VCC #PWR03
U 1 1 492F145C
P 5200 5450
F 0 "#PWR03" H 5200 5550 30  0001 C C
F 1 "VCC" H 5200 5550 30  0000 C C
	1    5200 5450
	1    0    0    -1  
$EndComp
$Comp
L +5V #PWR04
U 1 1 492F1437
P 4250 5450
F 0 "#PWR04" H 4250 5540 20  0001 C C
F 1 "+5V" H 4250 5540 30  0000 C C
	1    4250 5450
	1    0    0    -1  
$EndComp
$Comp
L DIODE D4
U 1 1 492F142B
P 4900 5550
F 0 "D4" H 4900 5650 40  0000 C C
F 1 "DIODE" H 4900 5450 40  0000 C C
	1    4900 5550
	1    0    0    -1  
$EndComp
$Comp
L DIODE D3
U 1 1 492F1422
P 4500 5550
F 0 "D3" H 4500 5650 40  0000 C C
F 1 "DIODE" H 4500 5450 40  0000 C C
	1    4500 5550
	1    0    0    -1  
$EndComp
$Comp
L R R6
U 1 1 492F13B2
P 7750 6050
F 0 "R6" V 7830 6050 50  0000 C C
F 1 "1k5" V 7750 6050 50  0000 C C
	1    7750 6050
	-1   0    0    1   
$EndComp
$Comp
L GND #PWR05
U 1 1 492F1347
P 5550 6300
F 0 "#PWR05" H 5550 6300 30  0001 C C
F 1 "GND" H 5550 6230 30  0001 C C
	1    5550 6300
	1    0    0    -1  
$EndComp
$Comp
L ZENER D1
U 1 1 492F132E
P 6000 6150
F 0 "D1" H 6000 6250 50  0000 C C
F 1 "3V6" H 6000 6050 40  0000 C C
	1    6000 6150
	1    0    0    -1  
$EndComp
$Comp
L ZENER D2
U 1 1 492F131F
P 5850 5950
F 0 "D2" H 5850 6050 50  0000 C C
F 1 "3V6" H 5800 5850 40  0000 C C
	1    5850 5950
	1    0    0    -1  
$EndComp
$Comp
L R R4
U 1 1 492F12D5
P 6200 5500
F 0 "R4" V 6280 5500 50  0000 C C
F 1 "68" V 6200 5500 50  0000 C C
	1    6200 5500
	1    0    0    -1  
$EndComp
$Comp
L R R5
U 1 1 492F12CC
P 6300 5300
F 0 "R5" V 6380 5300 50  0000 C C
F 1 "68" V 6300 5300 50  0000 C C
	1    6300 5300
	1    0    0    -1  
$EndComp
$Comp
L R R3
U 1 1 492F129C
P 7100 3700
F 0 "R3" V 7180 3700 50  0000 C C
F 1 "680" V 7100 3700 50  0000 C C
	1    7100 3700
	0    1    1    0   
$EndComp
$Comp
L +5V #PWR06
U 1 1 492F1269
P 7500 2800
F 0 "#PWR06" H 7500 2890 20  0001 C C
F 1 "+5V" H 7500 2890 30  0000 C C
	1    7500 2800
	1    0    0    -1  
$EndComp
$Comp
L +5V #PWR07
U 1 1 492F1139
P 7750 5800
F 0 "#PWR07" H 7750 5890 20  0001 C C
F 1 "+5V" H 7750 5890 30  0000 C C
	1    7750 5800
	1    0    0    -1  
$EndComp
$Comp
L GND #PWR08
U 1 1 492F10B8
P 6600 3300
F 0 "#PWR08" H 6600 3300 30  0001 C C
F 1 "GND" H 6600 3230 30  0001 C C
	1    6600 3300
	1    0    0    -1  
$EndComp
$Comp
L CONN_5X2 JP1
U 1 1 492F0593
P 7200 5000
F 0 "JP1" H 7200 5300 60  0000 C C
F 1 "CONN_5X2" V 7200 5000 50  0000 C C
	1    7200 5000
	1    0    0    -1  
$EndComp
$Comp
L GND #PWR09
U 1 1 492F0F39
P 7600 5300
F 0 "#PWR09" H 7600 5300 30  0001 C C
F 1 "GND" H 7600 5230 30  0001 C C
	1    7600 5300
	1    0    0    -1  
$EndComp
$Comp
L CHS-04A SW1
U 1 1 492F0B80
P 7100 2900
F 0 "SW1" V 6965 2700 50  0000 L B
F 1 "DIPSWITCH" V 7540 2700 50  0000 L B
F 2 "switch-copal-CHS-04A" H 7100 3050 50  0001 C C
	1    7100 2900
	0    1    1    0   
$EndComp
$Comp
L VCC #PWR010
U 1 1 492F05EF
P 6700 2800
F 0 "#PWR010" H 6700 2900 30  0001 C C
F 1 "VCC" H 6700 2900 30  0000 C C
	1    6700 2800
	1    0    0    -1  
$EndComp
$Comp
L GND #PWR011
U 1 1 492F05D4
P 7750 5500
F 0 "#PWR011" H 7750 5500 30  0001 C C
F 1 "GND" H 7750 5430 30  0001 C C
	1    7750 5500
	1    0    0    -1  
$EndComp
$Comp
L USB JP2
U 1 1 492F05B0
P 7000 6000
F 0 "JP2" H 6950 6400 60  0000 C C
F 1 "USB" V 6750 6150 60  0000 C C
	1    7000 6000
	-1   0    0    1   
$EndComp
$Comp
L GND #PWR012
U 1 1 492F054C
P 4000 2950
F 0 "#PWR012" H 4000 2950 30  0001 C C
F 1 "GND" H 4000 2880 30  0001 C C
	1    4000 2950
	1    0    0    -1  
$EndComp
$Comp
L VCC #PWR013
U 1 1 492F053B
P 3850 3100
F 0 "#PWR013" H 3850 3200 30  0001 C C
F 1 "VCC" H 3850 3200 30  0000 C C
	1    3850 3100
	1    0    0    -1  
$EndComp
$Comp
L VCC #PWR014
U 1 1 492F0517
P 3850 4100
F 0 "#PWR014" H 3850 4200 30  0001 C C
F 1 "VCC" H 3850 4200 30  0000 C C
	1    3850 4100
	1    0    0    -1  
$EndComp
$Comp
L GND #PWR015
U 1 1 492F050E
P 4050 3950
F 0 "#PWR015" H 4050 3950 30  0001 C C
F 1 "GND" H 4050 3880 30  0001 C C
	1    4050 3950
	1    0    0    -1  
$EndComp
$Comp
L GND #PWR016
U 1 1 492F04CE
P 3350 4150
F 0 "#PWR016" H 3350 4150 30  0001 C C
F 1 "GND" H 3350 4080 30  0001 C C
	1    3350 4150
	1    0    0    -1  
$EndComp
$Comp
L C C1
U 1 1 492F04AA
P 3550 3200
F 0 "C1" H 3600 3300 50  0000 L C
F 1 "22p" H 3600 3100 50  0000 L C
	1    3550 3200
	0    1    1    0   
$EndComp
$Comp
L C C2
U 1 1 492F047A
P 3550 3800
F 0 "C2" H 3600 3900 50  0000 L C
F 1 "22p" H 3600 3700 50  0000 L C
	1    3550 3800
	0    1    1    0   
$EndComp
$Comp
L MEGA8-P U1
U 1 1 492F0309
P 5050 3800
F 0 "U1" H 4350 2300 50  0000 L B
F 1 "ATmega88" H 4850 5100 50  0000 L B
F 2 "atmel-1-DIL28-3" H 5050 3950 50  0001 C C
	1    5050 3800
	1    0    0    -1  
$EndComp
$EndSCHEMATC
