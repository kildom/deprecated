#!/usr/bin/env python3

print("Start")

from time import sleep

from ev3dev2.sensor.lego import TouchSensor
from ev3dev2.led import Leds
from ev3dev2.sound import Sound
from ev3dev2.sensor.lego import ColorSensor
from ev3dev2.power import PowerSupply

print("Init")

ts = TouchSensor()
leds = Leds()
color = ColorSensor()
power = PowerSupply()

print("Press the touch sensor to change the LED color!")

color.mode = ColorSensor.MODE_COL_COLOR

leds.all_off()

mul = (1/202, 1/247, 1/141)

while True:
    if ts.is_pressed:
        break
    r, g, b = color.raw
    name = color.color_name
    r *= mul[0]
    g *= mul[1]
    b *= mul[2]
    v = max(r, g, b)
    if v < 0.05:
        print('\r          ', name, r, g, b, '        ')
    else:
        rr = int(round(r / v * 255))
        gg = int(round(g / v * 255))
        bb = int(round(b / v * 255))
        print('\r\x1b[48;2;{0};{1};{2}m          \x1b[0m'.format(rr, gg, bb), name, r, g, b, '        ')
    print('                   ', power.measured_amps, power.measured_volts)
    sleep(0.2)

spkr = Sound()
spkr.play_file('wpr.wav', play_type=Sound.PLAY_NO_WAIT_FOR_COMPLETE)

while True:
    if ts.is_pressed:
        leds.set_color("LEFT", "RED")
        leds.set_color("RIGHT", "GREEN")
    else:
        leds.set_color("LEFT", "GREEN")
        leds.set_color("RIGHT", "RED")
    sleep(0.05)
