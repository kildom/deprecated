

def _f21(mod, *p):
    # *p if some parameters are used in external blocks
    # l0, l1, ... if parameters are used only in local block
    l = [0, 0, 0.0] # only locals that are used in external blocks
    l3 = 0 # locals that are used only in local block
    while True:
        # ...
        while True:
            # ...
            while True:
                # ...
                bt = 3
                break
                # ...
            if bt < 3:
                break
