#!/usr/bin/env python3

print("Start")

from time import sleep
import math
from ev3dev2.sensor.lego import ColorSensor
from ev3dev2.motor import Motor, MediumMotor, LargeMotor, SpeedPercent 
from ev3dev2.led import Leds
from ev3dev2.sound import Sound

BASE_POS = 136
DIR_POS = 76
THROW_POS = 115

ref_colors = [
    (19, 32, 54, 'b'),
    (12, 28, 54, 'b'),
    (22, 59, 74, 'c'),
    (14, 59, 79, 'c'),
    (102, 71, 20, 'y'),
    (98, 70, 25, 'y'),
    (87, 15, 33, 'm'),
    (82, 20, 36, 'm'),
    (18, 30, 17, 'G'),
    (12, 31, 12, 'G'),
    (26, 56, 24, 'g'),
    (22, 53, 17, 'g'),
    (95, 43, 23, 'o'),
    (99, 43, 18, 'o'),
    (56, 44, 68, 'v'),
    (51, 42, 62, 'v'),
    (99, 98, 99, 'w'),
    (102, 102, 104, 'w'),
    (86, 13, 14, 'r'),
    (82, 21, 21, 'r'),
    (81, 81, 79, 's'),
    (76, 76, 74, 's'),
    (40, 38, 37, 'S'),
    (44, 40, 39, 'S')
]

def reset_pos():
    switchMotor.run_direct(duty_cycle_sp=20)
    switchMotor.position_d
    sleep(5)
    switchMotor.reset()
    switchMotor.off(False)
    switchMotor.on_to_position(SpeedPercent(20), -BASE_POS, True, True)
    sleep(1)
    switchMotor.reset()
    switchMotor.off(False)

def set_direction(pos, off=True):
    switchMotor.on_to_position(SpeedPercent(30), pos, True, True)
    if off:
        sleep(0.5)
        switchMotor.off(False)

def dir_set(keep):
    set_direction(DIR_POS if keep else -DIR_POS)

def dir_throw(keep):
    set_direction(THROW_POS if keep else -THROW_POS, False)
    set_direction(DIR_POS if keep else -DIR_POS)

def dir_stop():
    set_direction(0)


print("Init")

color = ColorSensor()
motor = MediumMotor()
switchMotor = LargeMotor()
leds = Leds()
spkr = Sound()


print("Run")

reset_pos()

color.mode = ColorSensor.MODE_COL_COLOR
motor.reset()
leds.all_off()

def get_color(r, g, b):
    min_diff = 1000000000
    result = None
    for rr, gg, bb, res in ref_colors:
        rr -= r
        gg -= g
        bb -= b
        diff = math.sqrt(rr * rr + gg * gg + bb * bb)
        #print(res, round(diff * 10))
        if diff < min_diff:
            min_diff = diff
            result = res
    return result


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

current = ''

dir_set(False)

while True:

    arr = []

    def reading_colors(r, g, b):
        v = max(r, g, b)
        if v > 11:
            arr.append((r, g, b))
            return False
        else:
            return True

    wait_for_color(lambda r, g, b: max(r, g, b) > 15, 0.1, 0.4)

    motor.on(SpeedPercent(7), False, False)

    wait_for_color(reading_colors, 0.04, 0.2)

    motor.off(False)

    # 30% - ok, 70% - remove, 25% end + 45%

    num = len(arr)
    if (num < 20):
        continue
    trim_begin = math.ceil(num * 0.45)
    trim_end = math.ceil(num * 0.25)
    arr = arr[trim_begin:num - trim_end]

    rr = 0
    gg = 0
    bb = 0
    for r, g, b in arr:
        rr += r
        gg += g
        bb += b
    rr = round(rr / len(arr))
    gg = round(gg / len(arr))
    bb = round(bb / len(arr))
    col = get_color(rr, gg, bb)
    print(rr, gg, bb, col, current)

    spkr.play_file((col if col.lower() == col else (col + col)) + ".wav", play_type=Sound.PLAY_NO_WAIT_FOR_COMPLETE)

    current += col
    if len(current) > 20:
        current = current[1:]

    if current[:-1].endswith('y'):
        dir_throw(True)
    #if current.endswith('bcyG'):
    #    dir_throw(True)
    #elif current[:-1].endswith('bcy'):
    #    dir_throw(False)
    else:
        pass

    if current.endswith('y'):
        dir_stop()
    else:
        dir_set(False)


