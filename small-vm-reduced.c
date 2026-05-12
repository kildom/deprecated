

#include <stdint.h>
#include <string.h>

struct vm_t {
    uint8_t* pc;
    uint32_t* asp;
    uint32_t* psp;
    //uint32_t* locals; - locals are referenced relative to asp/psp
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
            *vm->asp++ = 0;
            break;
        case 0x02: // ldpc     - LoaD Primirive Constant
        case 0x03: // ldpc2    - LoaD Primirive Constant, 2 words
        case 0x04: // ldpc_w   - LoaD Primirive Constant
        case 0x05: // ldpc2_w  - LoaD Primirive Constant, 2 words
            value32 = *vm->pc++;
            if (instruction & 0x04) {
                value32 |= *vm->pc++ << 8;
            }
            *vm->psp++ = vm->primitive_const_pool[value32];
            if (instruction & 0x02) {
                *vm->psp++ = vm->primitive_const_pool[value32 + 1];
            }
            break;
        // TODO: Other types of load constant instructions
        case 0x08: // iconst_{N}
        case 0x09:
        case 0x0A:
        case 0x0B:
        case 0x0C:
        case 0x0D:
        case 0x0E:
        case 0x0F:
            *vm->psp++ = instruction - 0x09;
            break;
        //case // lconst_{N} - REMOVED - replaced by two: iconst_{N}, iconst_0
        //case // fconst_{N} - REMOVED - replaced by: iconst_0 for 0.0f, ldpc otherwise
        //case // dconst_{N} - REMOVED - replaced by two: iconst_0 or ldpc, iconst_0 or ldpc
        case 0x10: // bipush
            *vm->psp++ = *vm->pc++;
            break;
        case 0x11: // sipush_{N}
            value32 = *vm->pc++;
            value32 |= *vm->pc++ << 8;
            *vm->psp++ = (uint16_t)value32;
            break;
        case 0x12: // iload
        case 0x13: // iload_w
        case 0x14: // aload
        case 0x15: // aload_w
            value32 = *vm->pc++;
            if (instruction & 0x01) {
                value32 |= *vm->pc++ << 8;
                if (instruction & INSTR_WIDE) {
                    value32 |= *vm->pc++ << 16;
                }
            }
            if (instruction & 0x04) {
                value32 = vm->asp[-(value32 + 1)];
                *vm->asp++ = value32
            } else {
                value32 = vm->psp[-(value32 + 1)];
                *vm->psp++ = value32;
            }
            break;
        //case // fload - REMOVED - replaced by: iload
        //case // lload - REMOVED - replaced by: 2x iload
        //case // dload - REMOVED - replaced by: 2x iload
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
            uint32_t index = *--vm->psp;
            uint32_t array_ref = *--vm->asp;
            uint64_t value = load_array_int(array_ref, index, size, instruction - 0x2E);
            if (instruction & _some_bit_) {
                *vm->psp++ = (uint32_t)(value & 0xFFFFFFFF);// TODO: If exception was emitted, the stack unwinding should be done outside.
            } else {
                *vm->asp++ = (uint32_t)(value & 0xFFFFFFFF);// TODO: If exception was emitted, the stack unwinding should be done outside.
            }
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
        case 0x42: // istore
        case 0x43: // istore_w
        case 0x44: // astore
        case 0x45: // astore_w
            value32 = *vm->pc++; // TODO: maybe instruction with immidiate encoded, needed: 0, 1
            if (instruction & 0x01) {
                value32 |= *vm->pc++ << 8;
                if (instruction & INSTR_WIDE) {
                    value32 |= *vm->pc++ << 16;
                }
            }
            if (instruction & 0x04) {
                vm->asp--;
                uint32_t value = *vm->asp;
                vm->asp[-value32] = value;
            } else {
                vm->psp--;
                uint32_t value = *vm->psp;
                vm->psp[-value32] = value;
            }
            break;
        case 0x46: // idup
        case 0x48: // adup
            value32 = *vm->pc++; // TODO: maybe encode immidiate value into instruction, needed: 1, 2, 3, 4
            uint32_t* dst;
            if (instruction & 0x04) {
                dst = vm->asp;
                vm->asp++;
            } else {
                dst = vm->psp;
                vm->psp++;
            }
            memmove(&dst[-value32], &dst[-(value32 + 1)], sizeof(uint32_t) * (value32 + 1));
            dst[-(value32 + 1)] = dst[0];
            break;
        // replacements: dup -> iload 0 | dup_x1 -> idup 1 | dup_x2 -> idup 2
        //   dup2 -> iload 1, iload 1 | dup2_x1 -> dup 2, swap, dup 3, swap | dup2_x2 -> dup 3, swap, dup 4, swap
        // the same with refs (adup)

        case 0x5F: // aswap
            uint32_t temp1 = vm->asp[-1];
            uint32_t temp2 = vm->asp[-2];
            vm->asp[-1] = temp2;
            vm->asp[-2] = temp1;
            break;

        case 0x5F: // iswap
            uint32_t temp1 = vm->psp[-1];
            uint32_t temp2 = vm->psp[-2];
            vm->psp[-1] = temp2;
            vm->psp[-2] = temp1;
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
            vm->psp--;
            int32_t b = vm->psp[0];
            int32_t a = vm->psp[-1];
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
            vm->psp[-1] = a;
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
            int64_t a = ((int64_t)vm->psp[-1] << 32) | vm->psp[-2];
            int64_t b = ((int64_t)vm->psp[1] << 32) | vm->psp[0];
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
            vm->psp[-2] = (uint32_t)(a & 0xFFFFFFFF);
            vm->psp[-1] = (uint32_t)(a >> 32);
            break;

        case 0x74: // ineg
            int32_t a = vm->psp[-1];
            a = -a;
            vm->psp[-1] = a;
            break;
            
        case 0x75: // lneg
            int64_t a = ((int64_t)vm->psp[-1] << 32) | vm->psp[-2];
            a = -a;
            vm->psp[-2] = (uint32_t)(a & 0xFFFFFFFF);
            vm->psp[-1] = (uint32_t)(a >> 32);
            break;
            
        case 0x76: // fneg
            vm->psp[-1] ^= 0x80000000;
            break;
            
        //case // dneg - REMOVED - replaced by fneg that works also for double, since higher word is located at stack top
            
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

