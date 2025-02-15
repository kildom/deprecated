#!/usr/bin/env python3

print("Start")

from time import sleep
import math
from ev3dev2.sensor.lego import ColorSensor
from ev3dev2.motor import Motor, MediumMotor, LargeMotor, SpeedPercent 
from ev3dev2.led import Leds

print("Init")

BASE_POS = 136
DIR_POS = 76

color = ColorSensor()
loadMotor = MediumMotor()
switchMotor = LargeMotor()
leds = Leds()

print("Run")

def reset_pos():
    switchMotor.run_direct(duty_cycle_sp=15)
    switchMotor.position_d
    sleep(5)
    switchMotor.reset()
    switchMotor.off(False)
    switchMotor.on_to_position(SpeedPercent(20), -BASE_POS, True, True)
    sleep(1)
    switchMotor.reset()
    switchMotor.off(False)

def set_direction(direction):
    pos = -DIR_POS if direction < 0 else (DIR_POS if direction > 0 else 0)
    switchMotor.on_to_position(SpeedPercent(30), pos, True, True)
    sleep(0.5)
    switchMotor.off(False)

def dir_keep():
    set_direction(-1)

def dir_throw():
    set_direction(1)

def dir_stop():
    set_direction(0)

reset_pos()
