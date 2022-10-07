
TODO: Using nested functions and `nonlocal` for block functions is faster. See `test_inner_blocks.py`.
Using `nonlocal` for stack should also be faster.
* only touched stack variables should be `nonlocal`,
* all `nonlocal` stack variables must be assigned in top level function. It can be anywhere,
  but if it is not somewhere in the top level function code, then it must be initialized at the beginning `sXX = None`.
* for initial draft full stack can be initialized on the top level function and full stack can be in `nonlocal`.

```python

def _f0(mod, *a):
	return mod.imports.some_mod.some_func(*a)
# ...
def _f20(mod, l0, l1, l2):
	f0(s0, s1, s2)
def _b1(mod, p, l, s12, s13, s14):
	# ...
	return (bt, s12, s13)
def _f21(mod, *p):
	l = [0, 0, 0.0]
	# if nested more than 20 blocks
	r = b1(p, l, s12, s13)
	if r[0] < 19:
		break
	while True: # block [1, 2]
		while True: # loop [2]
			while True: # block [3]
				...
				bt = 3 # break block [3]
				break
				...
				bt = 2 # continue loop [2]
				break
				...
				bt = 1 # break block [1]
				break
				...
				bt = 0 # break below block [1]
				break
				...
				# if inner block is not breaking outer block/loop
				s6 = _b23(p, l, s6, s7)
				...
				# if inner block is breaking outer block/loop
				r = _b23(p, l, s6, s7)
				if r >= 0:
					bt = r[0]
					break
			# loop must contain special if case for continue
			if bt < 3:
				if bt == 2: continue
				break
		if bt < 2: break
		if bt == 2:
			# if block [2] is targeted from external block,
			# storing result is the target's parent responsibility
			bt, s1, s3 = r
	if bt < 1: break

class _MyModuleExports:
	def __init__(self, mod):
		self.mod = mod
	def some_func2(self, x: int, y: int, z: float):
		return _f21(self.mod, x, y, z)

class MyModule:
	def __init__(self):
		self.exports = _MyModuleExports(self)

# Usage:

m = MyModule()
m.imports.some_mod.some_func = my_some_func
m.start()
res = m.exports.some_func2(1, 2, 3.4)

```