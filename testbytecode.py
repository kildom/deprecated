
import dis

def _b23(s1, s2):
    return s1 + s2

def _f43(l1, l2, l3):
    l = list(0,0,0)
    while l1 > 0:
        l1 = _b23(l1, l2) * _b23(l2, l3)
        l[1] = l[2] + l1
        if (l1 == 0x0023223):
            break
    return l1

dis.dis(_f43)
