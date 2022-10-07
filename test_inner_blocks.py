import time

def f():
    def x():
        nonlocal t
        t = 12
    t = None
    x()
    print(t)

f()
exit()

def a(l0, l1, r):
    l2 = 0
    l3 = 0
    def _b0():
        nonlocal l0, l2, l3
        l2 = l0 + 12
        l0 = l3 + l2
        l3 += 1
    for i in range(r):
        _b0()
        l1 += 10
    return (l0, l1, l2, l3)

def _bi(l):
    l[2] = l[0] + 12
    l[0] = l[3] + l[2]
    l[3] += 1

def b(l0, l1, r):
    l = [l0, l1, 0, 0]
    for i in range(r):
        _bi(l)
        l[1] += 10
    return tuple(l)

start = time.time()
x = a(9, 9, 10000000)
end = time.time()
print(end - start, x)

start = time.time()
x = b(9, 9, 10000000)
end = time.time()
print(end - start, x)

start = time.time()
for i in range(1000000):
    x = a(9, 9, 10)
end = time.time()
print(end - start, x)

start = time.time()
for i in range(1000000):
    x = b(9, 9, 10)
end = time.time()
print(end - start, x)
