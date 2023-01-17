
TODO: Using nested functions and `nonlocal` for block functions is faster. See `test_inner_blocks.py`.
Using `nonlocal` for stack should also be faster.
* only touched stack variables should be `nonlocal`,
* all `nonlocal` stack variables must be assigned in top level function. It can be anywhere,
  but if it is not somewhere in the top level function code, then it must be initialized at the beginning `sXX = None`.
* for initial draft full stack can be initialized on the top level function and full stack can be in `nonlocal`.

```python

# BLOCK template:

while True:            # BLOCK B12 @4
	# ...
	bt = 4; break  # BR 0 -> B12 @4
	# ...
	bt = 3; break  # BR 1 -> B8 @3
              # ^-- Can also be `return` if branch target is outside this chunk function
	# ...
	bt = 4; break  # END B12 @4
	#    ^--- Assignment and break are needed only if END instruction is reachable
if bt < 4: break       # ^
#  ^--- Checking `bt` is needed only if block breaks target outside itself.

# IF/ELSE template:

while s10 != 0:        # IF I33 @5
	# ...
	bt = 5; break  # BR 0 -> I33 @5
	# ...
	bt = 4; break  # BR 1 -> B31 @4
	# ...
	bt = 5; break              # ELSE i33 @5
# start of part that exists only if ELSE exists
else:                              # ^
	bt = 6                     # ^
while bt == 6:                     # ^
	# ...
	bt = 5; break  # BR 0 -> I33 @5
	# ...
	bt = 4; break  # BR 1 -> B31 @4
	# ...
	bt = 5; break  # END I33 @5
# end of part that exists only if ELSE exists
if bt < 5: break               # ^

# LOOP template:

while True:            # LOOP L123 @3
	# ...
	continue       # BR 0 -> L123 @3
	# ...
	while True:                   # BLOCK B188 @4
		# ...
		bt = 3; break;        # BR 1 -> L123 @3
		# ...
	if bt < 4:                    # END B188 @4
		if bt == 3: continue  # ^
		# ^--- Additional if is needed only if inner blocks target this LOOP
		break                 # ^
	# ...
	bt = 2; break  # BR 1 -> I99 @2
	# ...
if bt < 3: break       # END L123 @3

# Inserting block that is in a different chunk

	# When chunk breaks targets outside itself
	_ch18()              # LOOP L18 @8
	if bt <= 7: break    # ^^^^^^^^^^
	       # ^--- where 7 is current block index

	# When chunk does not break targets outside itself
	_ch12()              # LOOP L12

	# When inserting chunk with IF/ELSE top-level block, top level while/else can be moved to expression:
	_ch12() if s12 != 0 else _ch13()
	
	# When inserting chunk with BLOCK top-level block, top level while can be removed and calling it will be the same:
	_ch12()

```

### OLD

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
