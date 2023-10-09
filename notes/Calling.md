
```sh

# func(1, 2);
GetLocal func
PushInt 1
PushInt 2
# if bytecode location unknown
    PushInt 2
    Call
# OR if bytecode location is known during compilation
    BrWithLink func_start_without_prepare
...


func_start: # Func | A | B | ... | N | RetAddr
BrWithLink prepareParameters2
func_start_without_prepare: # | Func | A | B | RetAddr


```