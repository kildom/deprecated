

#include <stdint.h>
#include <string.h>

struct vm_t {
    uint8_t* pc;
    uint32_t* sp; // TODO: Should be 2 stacks: one for primitive values and one for references.
                  //       This way we can remove tracking of the references on stack for GC.
                  //       Additional benefit: simpler type checking, since all primive types  can be treted the same, and
                  //       all reference types can be treted the same, we need to track only stacks sizes.
                  //       Downside: the bytecode must be transformed - instructions that manipulate stack
                  //       without type information must be replaced, e.g. pop, dup, swap, etc.
                  //       Maybe do one step further: seperate spaces for primitive and reference local variables:
                  //       when transforming bytecode, the local variable is identified by index AND kind (ref or primitive).
                  //       Unused locals will be removed.
    uint32_t* locals;
    uint32_t* const_pool;
};

uint32_t BIT_CAST_FLOAT_TO_UINT32(float);
uint64_t BIT_CAST_DOUBLE_TO_UINT64(double);
uint64_t load_array_int(uint32_t array_ref, uint32_t index, uint32_t size, uint32_t type);
uint64_t store_array_int(uint32_t array_ref, uint32_t index, uint32_t size, uint32_t type, uint32_t value);

void instr_exec(struct vm_t* vm) {

    uint8_t instruction = *vm->pc++;

    uint64_t value64;
    uint32_t value32;
    uint32_t size = 0;

    switch (instruction) {
        case 0x00: // nop
            break;
        case 0x01: // aconst_null
            *vm->sp++ = 0;
            break;
        case 0x02: // iconst_{N}
        case 0x03:
        case 0x04:
        case 0x05:
        case 0x06:
        case 0x07:
        case 0x08:
            *vm->sp++ = instruction - 0x03;
            break;
        case 0x09: // lconst_{N}
        case 0x0A:
            *vm->sp++ = instruction - 0x09;
            *vm->sp++ = 0;
            break;
        case 0x0B: // fconst_{N}
        case 0x0C:
        case 0x0D:
            *vm->sp++ = BIT_CAST_FLOAT_TO_UINT32((float)(instruction - 0x0B));
            break;
        case 0x0E: // dconst_{N}
        case 0x0F:
            value64 = BIT_CAST_DOUBLE_TO_UINT64((double)(instruction - 0x0E));
            *vm->sp++ = (uint32_t)(value64 & 0xFFFFFFFF);
            *vm->sp++ = (uint32_t)(value64 >> 32);
            break;
        case 0x10: // bipush_{N}
            *vm->sp++ = *vm->pc++;
            break;
        case 0x11: // sipush_{N}
            value32 = *vm->pc++;
            value32 |= *vm->pc++ << 8;
            *vm->sp++ = value32;
            break;
        case 0x12: // ldc
            value32 = *vm->pc++;
            *vm->sp++ = vm->const_pool[value32];
            break;
        case 0x13: // ldc_w
            value32 = *vm->pc++;
            value32 |= *vm->pc++ << 8;
            *vm->sp++ = vm->const_pool[value32];
            break;
        case 0x14: // ldc2_w
            value32 = *vm->pc++;
            value32 |= *vm->pc++ << 8;
            *vm->sp++ = vm->const_pool[value32];
            *vm->sp++ = vm->const_pool[value32 + 1];
            break;
        case 0x15: // iload
        case 0x17: // fload
        case 0x19: // aload
            *vm->sp++ = vm->locals[*vm->pc++];
            break;
        case 0x16: // lload
        case 0x18: // dload
            value32 = *vm->pc++;
            *vm->sp++ = vm->locals[value32];
            *vm->sp++ = vm->locals[value32 + 1];
            break;
        case 0x1A: // iload_{N}
        case 0x1B:
        case 0x1C:
        case 0x1D:
        case 0x22: // fload_{N}
        case 0x23:
        case 0x24:
        case 0x25:
        case 0x2A: // aload_{N}
        case 0x2B:
        case 0x2C:
        case 0x2D:
            *vm->sp++ = vm->locals[3 & (instruction - 2)];
            break;
        case 0x1E: // lload_{N}
        case 0x1F:
        case 0x20:
        case 0x21:
        case 0x26: // dload_{N}
        case 0x27:
        case 0x28:
        case 0x29:
            value32 = 3 & (instruction - 2);
            *vm->sp++ = vm->locals[value32];
            *vm->sp++ = vm->locals[value32 + 1];
            break;
        case 0x2F: // laload
        case 0x31: // daload
            size += 4;
            // fallthrough
        case 0x2E: // iaload
        case 0x30: // faload
        case 0x32: // aaload
            size += 2;
            // fallthrough
        case 0x34: // caload
        case 0x35: // saload
            size += 1;
            // fallthrough
        case 0x33: // baload
            size += 1;
            uint32_t index = *--vm->sp;
            uint32_t array_ref = *--vm->sp;
            uint64_t value = load_array_int(array_ref, index, size, instruction - 0x2E);
            *vm->sp++ = (uint32_t)(value & 0xFFFFFFFF);// TODO: If exception was emitted, the stack unwinding should be done outside.
            if (size > 4) {
                *vm->sp++ = (uint32_t)(value >> 32);
            }
            /*Example: ArrayHead* head = (ArrayHead*)&heads[array_ref];
            Array* array = (Array*)head->data;
            if (index < head->length ) { // TODO: Check also type and is it really an array
                stack[sp++] = ((uint32_t*)array->data)[index];
            } else {
                THROW(ArrayIndexOutOfBoundsException);
            }
                // To support `instruction - 0x2E` expression, the type codes are defined as follows:
                TYPE_INT = 0;
                TYPE_LONG = 1;
                TYPE_FLOAT = 2;
                TYPE_DOUBLE = 3;
                TYPE_REF = 4;
                TYPE_BYTE = 5;
                TYPE_CHAR = 6;
                TYPE_SHORT = 7;
                */
            break;
        case 0x36: // istore
        case 0x38: // fstore
        case 0x3A: // astore
            vm->locals[*vm->pc++] = *--vm->sp;
            break;
        case 0x37: // lstore
        case 0x39: // dstore
            value32 = *vm->pc++;
            vm->locals[value32] = *--vm->sp;
            vm->locals[value32 + 1] = *--vm->sp;
            break;
        case 0x3B: // istore_{N}
        case 0x3C:
        case 0x3D:
        case 0x3E:
        case 0x43: // fstore_{N}
        case 0x44:
        case 0x45:
        case 0x46:
        case 0x4B: // astore_{N}
        case 0x4C:
        case 0x4D:
        case 0x4E:
            vm->locals[3 & (instruction - 3)] = *--vm->sp;
            break;
        case 0x3f: // lstore_{N}
        case 0x40:
        case 0x41:
        case 0x42:
        case 0x47: // dstore_{N}
        case 0x48:
        case 0x49:
        case 0x4A: {
            uint32_t index = 3 & (instruction - 3);
            vm->locals[index] = *--vm->sp;
            vm->locals[index + 1] = *--vm->sp;
            break;
        }
        case 0x50: // lastore
        case 0x52: // dastore
            size += 4;
            // fallthrough
        case 0x4F: // iastore
        case 0x51: // fastore
        case 0x53: // aastore
            size += 2;
            // fallthrough
        case 0x55: // castore
        case 0x56: // sastore
            size += 1;
            // fallthrough
        case 0x54: // bastore
        {
            size += 1;
            uint64_t value = *--vm->sp;
            if (size > 4) {
                value |= ((uint64_t)*--vm->sp) << 32;
            }
            uint32_t index = *--vm->sp;
            uint32_t array_ref = *--vm->sp;
            store_array_int(array_ref, index, size, instruction - 0x4F, value);
            break;
        }
        case 0x58: // pop2
            size += 1;
            // fallthrough
        case 0x88: // l2i (just remove high word)
        case 0x57: // pop
            vm->sp -= size + 1;
            break;

        case 0x5C: // dup2
        case 0x5D: // dup2_x1
        case 0x5E: // dup2_x2
            size += 1;
            // fallthrough
        case 0x59: // dup
        case 0x5A: // dup_x1
        case 0x5B: // dup_x2
            uint32_t move_items;
            move_items = instruction - 0x58;
            move_items = (move_items >> 2) + (move_items & 3);
            move_items += size;
            size += 1;
            memmove(vm->sp - move_items + size, vm->sp - move_items, move_items * sizeof(uint32_t));
            memmove(vm->sp - move_items, vm->sp, size * sizeof(uint32_t));
            vm->sp += size;
            break;

        case 0x5F: // swap
            uint32_t temp1 = vm->sp[-1];
            uint32_t temp2 = vm->sp[-2];
            vm->sp[-1] = temp2;
            vm->sp[-2] = temp1;
            break;

        case 0x60: // 0110 0000 iadd
        case 0x62: // 0110 0010 fadd
        case 0x64: // 0110 0100 isub
        case 0x66: // 0110 0110 fsub
        case 0x68: // 0110 1000 imul
        case 0x6A: // 0110 1010 fmul
        case 0x6C: // 0110 1100 idiv
        case 0x6E: // 0110 1110 fdiv
        case 0x70: // 0111 0000 irem
        case 0x72: // 0111 0010 frem
            vm->sp--;
            int32_t b = vm->sp[0];
            int32_t a = vm->sp[-1];
            if (instruction & 0x02) {
                float fa = BIT_CAST_UINT32_TO_FLOAT(a);
                float fb = BIT_CAST_UINT32_TO_FLOAT(b);
                switch (7 & (instruction >> 2)) {
                    case 0: fa += fb; break;
                    case 1: fa -= fb; break;
                    case 2: fa *= fb; break;
                    case 3: fa /= fb; break;
                    case 4: fa = fmodf(fa, fb); break;
                }
                a = BIT_CAST_FLOAT_TO_UINT32(fa);
            } else {
                switch (7 & (instruction >> 2)) {
                    case 0: a += b; break;
                    case 1: a -= b; break;
                    case 2: a *= b; break;
                    case 3: a /= b; break;
                    case 4: a %= b; break;
                }
            }
            vm->sp[-1] = a;
            break;

        case 0x61: // 0110 0001 ladd
        case 0x63: // 0110 0011 dadd
        case 0x65: // 0110 0101 lsub
        case 0x67: // 0110 0111 dsub
        case 0x69: // 0110 1001 lmul
        case 0x6B: // 0110 1011 dmul
        case 0x6D: // 0110 1101 ldiv
        case 0x6F: // 0110 1111 ddiv
        case 0x71: // 0111 0001 lrem
        case 0x73: // 0111 0011 drem
            vm->sp -= 2;
            int64_t a = ((int64_t)vm->sp[-1] << 32) | vm->sp[-2];
            int64_t b = ((int64_t)vm->sp[1] << 32) | vm->sp[0];
            if (instruction & 0x02) {
                double da = BIT_CAST_UINT64_TO_DOUBLE(a);
                double db = BIT_CAST_UINT64_TO_DOUBLE(b);
                switch (7 & (instruction >> 2)) {
                    case 0: da += db; break;
                    case 1: da -= db; break;
                    case 2: da *= db; break;
                    case 3: da /= db; break;
                    case 4: da = fmod(da, db); break;
                }
                a = BIT_CAST_DOUBLE_TO_UINT64(da);
            } else {
                switch (7 & (instruction >> 2)) {
                    case 0: a += b; break;
                    case 1: a -= b; break;
                    case 2: a *= b; break;
                    case 3: a /= b; break;
                    case 4: a %= b; break;
                }
            }
            vm->sp[-2] = (uint32_t)(a & 0xFFFFFFFF);
            vm->sp[-1] = (uint32_t)(a >> 32);
            break;

        case 0x74: // ineg
            int32_t a = vm->sp[-1];
            a = -a;
            vm->sp[-1] = a;
            break;
            
        case 0x75: // lneg
            int64_t a = ((int64_t)vm->sp[-1] << 32) | vm->sp[-2];
            a = -a;
            vm->sp[-2] = (uint32_t)(a & 0xFFFFFFFF);
            vm->sp[-1] = (uint32_t)(a >> 32);
            break;
            
        case 0x76: // fneg
            float a = BIT_CAST_UINT32_TO_FLOAT(vm->sp[-1]);
            a = -a;
            vm->sp[-1] = BIT_CAST_FLOAT_TO_UINT32(a);
            break;
            
        case 0x77: // dneg
            double da = BIT_CAST_UINT64_TO_DOUBLE(((int64_t)vm->sp[-1] << 32) | vm->sp[-2]);
            da = -da;
            int64_t a = BIT_CAST_DOUBLE_TO_UINT64(da);
            vm->sp[-2] = (uint32_t)(a & 0xFFFFFFFF);
            vm->sp[-1] = (uint32_t)(a >> 32);
            break;
            
        /* TODO: Check if separate int operations will be more optimal, for example:
        case 0x78: // 0111 1000 ishl
            vm->sp--;
            vm->sp[-1] = (int32_t)vm->sp[-1] << (vm->sp[0] & 0x1F);
            break;*/

        case 0x78: // 0111 1000 ishl
        case 0x7A: // 0111 1010 ishr
        case 0x7C: // 0111 1100 iushr
        case 0x7E: // 0111 1110 iand
        case 0x80: // 1000 0000 ior
        case 0x82: // 1000 0010 ixor
            vm->sp--;
            int32_t b = vm->sp[0];
            int32_t a = vm->sp[-1];
            switch (7 & (instruction >> 1)) { // TODO: Does it make sense recalculating it?
                case 0: a |= b; break;
                case 1: a ^= b; break;
                case 4: a <<= b & 0x1F; break;
                case 5: a >>= b & 0x1F; break;
                case 6: a = (uint32_t)a >> (b & 0x1F); break;
                case 7: a &= b; break;
            }
            vm->sp[-1] = a;
            break;

        case 0x79: // 0111 1001 lshl
        case 0x7B: // 0111 1011 lshr
        case 0x7D: // 0111 1101 lushr
        case 0x7F: // 0111 1111 land
        case 0x81: // 1000 0001 lor
        case 0x83: // 1000 0011 lxor
            vm->sp -= 2;
            int64_t a = ((int64_t)vm->sp[-1] << 32) | vm->sp[-2];
            int64_t b = ((int64_t)vm->sp[1] << 32) | vm->sp[0];
            switch (7 & (instruction >> 1)) {
                case 0: a |= b; break;
                case 1: a ^= b; break;
                case 4: a <<= b & 0x3F; break;
                case 5: a >>= b & 0x3F; break;
                case 6: a = (uint64_t)a >> (b & 0x3F); break;
                case 7: a &= b; break;
            }
            vm->sp[-2] = (uint32_t)(a & 0xFFFFFFFF);
            vm->sp[-1] = (uint32_t)(a >> 32);
            break;

        case 0x84: // iinc
            uint32_t index = code[pc++];
            int8_t constant = (int8_t)code[pc++];
            locals[index] += constant;
            break;

        case 0x85: // i2l
            if (vm->sp[-1] & 0x80000000) {
                size = 0xFFFFFFFF;
            }
            *vm->sp++ = size;
            break;

        case 0x86: // i2f
            vm->sp[-1] = BIT_CAST_FLOAT_TO_UINT32((float)(int32_t)vm->sp[-1]);
            break;

        case 0x87: // i2d
            value64 = BIT_CAST_DOUBLE_TO_UINT64((double)(int32_t)vm->sp[-1]);
            vm->sp[-1] = (uint32_t)(value64 & 0xFFFFFFFF);
            *vm->sp++ = (uint32_t)(value64 >> 32);
            break;

        case 0x89: // l2f
            vm->sp--;
            int64_t a = ((int64_t)vm->sp[0] << 32) | vm->sp[-1];
            vm->sp[-1] = BIT_CAST_FLOAT_TO_UINT32((float)a);
            break;

        case 0x8A: // l2d
            int64_t a = ((int64_t)vm->sp[-1] << 32) | vm->sp[-2];
            value64 = BIT_CAST_DOUBLE_TO_UINT64((double)a);
            vm->sp[-2] = (uint32_t)(value64 & 0xFFFFFFFF);
            vm->sp[-1] = (uint32_t)(value64 >> 32);
            break;

        case 0x8B: // f2i
            vm->sp[-1] = (int32_t)BIT_CAST_UINT32_TO_FLOAT(vm->sp[-1]);
            break;

        case 0x8C: // f2l
            value64 = (int64_t)BIT_CAST_UINT32_TO_FLOAT(vm->sp[-1]);
            vm->sp[-2] = (uint32_t)(value64 & 0xFFFFFFFF);
            vm->sp[-1] = (uint32_t)(value64 >> 32);
            break;

        case 0x8D: // i2d
            value64 = BIT_CAST_DOUBLE_TO_UINT64((double)(int32_t)vm->sp[-1]);
            vm->sp[-1] = (uint32_t)(value64 & 0xFFFFFFFF);
            *vm->sp++ = (uint32_t)(value64 >> 32);
            break;

        case 0x8E: // d2i
            vm->sp--;
            double a = BIT_CAST_UINT64_TO_DOUBLE(((int64_t)vm->sp[0] << 32) | vm->sp[-1]);
            vm->sp[-1] = (int32_t)a;
            break;

        case 0x8F: // d2l
            double a = BIT_CAST_UINT64_TO_DOUBLE(((int64_t)vm->sp[0] << 32) | vm->sp[-1]);
            value64 = (int64_t)a;
            vm->sp[-2] = (uint32_t)(value64 & 0xFFFFFFFF);
            vm->sp[-1] = (uint32_t)(value64 >> 32);
            break;
        
        case 0x90: // d2f
            vm->sp--;
            double a = BIT_CAST_UINT64_TO_DOUBLE(((int64_t)vm->sp[0] << 32) | vm->sp[-1]);
            vm->sp[-1] = BIT_CAST_FLOAT_TO_UINT32((float)a);
            break;
        
        case 0x91: // i2b
            vm->sp[-1] = (int8_t)(int32_t)vm->sp[-1];
            break;

        case 0x92: // i2c
            vm->sp[-1] = (uint16_t)vm->sp[-1];
            break;
        
        case 0x93: // i2s
            vm->sp[-1] = (int16_t)(int32_t)vm->sp[-1];
            break;

        // Some instruction missing

        case 0x99: // ifeq
            value32 = *--vm->sp;
            if (value32 == 0) {
                int16_t offset = *vm->pc++;
                offset |= *vm->pc++ << 8;
                vm->pc += (int32_t)offset - 3;
            }
            break;
        
        case 0xB1: // return
            value32 = return_method();
            if (!value32) {
                return; // When switch-case goes into loop, this will return from VM to native caller.
                // Otherwise, the loop will be executing caller method's bytecode.
            }
            break;
        // Other instructions are not possible after the verification
    }

    return;

// TODO: Those labels can be used instead of break to reduce some size.

push_value64:
    vm->sp++;
push_word_and_emplace_value64:
    vm->sp++;
emplace_value64:
    vm->sp[-2] = (uint32_t)(value64 & 0xFFFFFFFF);
    vm->sp[-1] = (uint32_t)(value64 >> 32);
    return;

push_value32:
    vm->sp++;
emplace_value32:
    vm->sp[-1] = value32;
    return;
}

