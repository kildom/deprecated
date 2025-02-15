#!/usr/bin/env python3

print("Start")

from time import sleep
import math
from ev3dev2.sensor.lego import ColorSensor
from ev3dev2.motor import Motor, MediumMotor, SpeedPercent 
from ev3dev2.led import Leds

print("Init")

color = ColorSensor()
motor = MediumMotor()
leds = Leds()

print("Run")

color.mode = ColorSensor.MODE_COL_COLOR
motor.reset()
leds.all_off()


def wait_for_color(callback, step, time):
    cnt = 0
    cnt_max = math.ceil(time / step)
    while True:
        r, g, b = color.raw
        r = round(r * 0.8316)
        g = round(g * 0.7533)
        b = round(b * 1.0076)
        sleep(step)
        if callback(r, g, b):
            cnt += 1
            if cnt >= cnt_max:
                return
        else:
            cnt = 0


def read_color():
    def reading_colors(r, g, b):
        v = max(r, g, b)
        if v > 11:
            arr.append((r, g, b))
            return False
        else:
            return True
    while True:
        arr = []
        wait_for_color(lambda r, g, b: max(r, g, b) > 15, 0.1, 0.4)
        motor.on(SpeedPercent(7), False, False)
        wait_for_color(reading_colors, 0.04, 0.2)
        motor.off(False)
        num = len(arr)
        if num >= 20:
            trim_begin = math.ceil(num * 0.45)
            trim_end = math.ceil(num * 0.25)
            arr = arr[trim_begin:num - trim_end]
            r = 0
            g = 0
            b = 0
            for rr, gg, bb in arr:
                r += rr
                g += gg
                b += bb
            r = round(r / len(arr))
            g = round(g / len(arr))
            b = round(b / len(arr))
            return r, g, b

ref_colors = []

while True:
    col = input('Color: ')
    rr = 0
    gg = 0
    bb = 0
    for i in range(0, 4):
        r, g, b = read_color()
        rr += 0.25 * r
        gg += 0.25 * g
        bb += 0.25 * b
    ref_colors.append((round(rr), round(gg), round(bb), col))
    print(ref_colors)
