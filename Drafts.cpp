#include <cstdint>

#define let auto

#define GC_REFCOUNTING 1
#define GC_TRACING 0
#define GC_INCREMENTAL 0
#define GC_GENERATIONAL 0
#define DOUBLE_ALIGNMENT_STRICT 0
#define DOUBLE_ALIGNMENT_BY_COMPILER 0
#define DOUBLE_ALIGNMENT_NONE 1
#define SINGLE_INSTANCE 0

class Instance
{
};

#if SINGLE_INSTANCE
#  define PARAMS
#  define ARGS
extern Instance instance;
#else
#  define PARAMS Instance &instance,
#  define ARGS instance,
#endif

/*
 * Value structure:
 * |   31 to 4  | 3..0 |
 * |    value   | type |
 *
 * Value with head:
 * |   31 to 8  |  7  |     6      |      5       |    4     | 3..0 |
 * | head index | ROM | Enumerable | Configurable | Writable | type |
 *
 * Value with head in ROM:
 * |   31 to 9  |      8     |  7  |     6      |      5       |    4     | 3..0 |
 * | head index | Engine ROM | ROM | Enumerable | Configurable | Writable | type |
 */

struct UnalignedDouble
{
#if DOUBLE_ALIGNMENT_STRICT
    // "double" access aligned to 32-bits is forbidden on this architecture
    uint32_t low32;
    uint32_t high32;
#elif DOUBLE_ALIGNMENT_BY_COMPILER
    // "double" access aligned to 32-bits is allowed on this architecture, but compiler automatically aligns "double" type
    uint32_t buffer[2];
#elif DOUBLE_ALIGNMENT_NONE
    // "double" access aligned to 32-bits is allowed and compiler does not align it
    double value;

    UnalignedDouble(double newValue):
        value(newValue)
    {
    }

    UnalignedDouble(const UnalignedDouble &other):
        value(other.value)
    {
    }

    UnalignedDouble &operator=(const UnalignedDouble &other)
    {
        value = other.value;
        return *this;
    }

    double operator=(double newValue)
    {
        value = newValue;
        return newValue;
    }

    operator double()
    {
        return value;
    }
#else
#  error "Double alignment not defined"
#endif
};

struct AccessFunctionTable;

namespace Head {
struct T;
}  // namespace Head

struct Value
{
    using T = uint32_t;

    // Simple head-less values
    static constexpr Value::T None = 0x0;            // 0-3 - none kind
    static constexpr Value::T Boolean = 0x1;         // 0, 1
    static constexpr Value::T Integer = 0x2;         // 28-bit signed integer, which is in range -2^27 .. 2^27-1
    static constexpr Value::T FinallyHandler = 0x3;  // 28-bit unsigned integer - finally block offset
    // Values with head only
    static constexpr Value::T Double = 0x4;      // Head Index          low32, high32
    static constexpr Value::T Symbol = 0x5;      // Head Index          description string
    static constexpr Value::T Accessor = 0x6;    // Head Index          getterIndex, setterIndex
    static constexpr Value::T Scope = 0x7;       // Head Index          values[2]
    static constexpr Value::T NativeHead = 0x8;  // Head Index          any[]
    // Values with head and block
    static constexpr Value::T Object = 0x9;       // Head Index          prototypeIndex32/16, *keys32, *values32
    static constexpr Value::T String = 0xA;       // Head Index          length32/16, bytes32/16, *ptr32
    static constexpr Value::T BigInt = 0xB;       // Head Index
    static constexpr Value::T NativeBlock = 0xC;  // Head Index          any[]

    static constexpr Value::T TypeMask = 0xF;  // lower 4 bits
    static constexpr Value::T ValueShift = 4;  // lower 4 bits
    static constexpr Value::T HeapHeadIndexShift = 8;
    static constexpr Value::T RomHeadIndexShift = 9;

    static constexpr Value::T FirstTypeWithHead = Value::Double;
    static constexpr Value::T FirstTypeWithBlock = Value::Object;

    static constexpr Value::T Empty = 0x00;      // 0 - empty slot (also used for uninitialized variables)
    static constexpr Value::T EndOfList = 0x10;  // 1 - end of list
    static constexpr Value::T Undefined = 0x20;  // 2 - undefined
    static constexpr Value::T Null = 0x30;       // 3 - null
    static constexpr Value::T False = 0x01;
    static constexpr Value::T True = 0x11;
    static constexpr Value::T Zero = 0x02;

    static inline Value::T getType(Value::T value)
    {
        return value & Value::TypeMask;
    }

    static const AccessFunctionTable &getAccessFunctionTable(PARAMS Value::T value);

    template<typename T>
    static T* getHead(PARAMS Value::T value);

    template<typename T>
    static T* getBlock(PARAMS Head::T* head)
    {
        return nullptr;  // TODO: implement this
    }

    template<typename T>
    static T* getBlock(PARAMS Value::T value)
    {
        return nullptr;  // TODO: implement this
    }

    static const Value::T RomFlag = 1 << 7;
    static const Value::T EngineFlag = 1 << 8;
    static const Value::T EnumerableFlag = 1 << 6;
    static const Value::T ConfigurableFlag = 1 << 5;
    static const Value::T WritableFlag = 1 << 4;
};

struct AccessFunctionTable
{
    void (*visitChildren)();
};

struct Block
{
    struct T
    {
        uint32_t headIndex;
        const AccessFunctionTable* access;
    };

    struct Object: public Block::T
    {
    };

    struct String: public Block::T
    {
    };

    struct BigInt: public Block::T
    {
    };

    using NativeBlock = Block::T;
};

#include <stdio.h>
#include <stdlib.h>

#define ASSERT(x)                                                                   \
    do {                                                                            \
        if (!(x)) {                                                                 \
            printf("%s:%d: error: Assertion failed: %s\n", __FILE__, __LINE__, #x); \
            exit(1);                                                                \
        }                                                                           \
    } while (0)

namespace Head {
struct T
{
#if GC_REFCOUNTING
    uint32_t refCounter;
#endif
#if GC_TRACING && GC_INCREMENTAL
    uint32_t flags;
#endif
    static constexpr bool checkType(Value::T type)
    {
        return type >= Value::FirstTypeWithHead;
    }
};

namespace prv {

static const Head::T* from(PARAMS Value::T value, bool check = true)
{
    if (!check) {
        const Head::T* table = nullptr;
        uint32_t index;
        if (value & Value::RomFlag) {
            //table = (value & Value::EngineFlag) ? engineHeadsTable : instance.romHeadsTable;
            index = value >> Value::RomHeadIndexShift;
        } else {
            //table = instance.heapHeadsTable;
            index = value >> Value::HeapHeadIndexShift;
        }
        uint32_t* size = (uint32_t*)table - 1;
        ASSERT(index < *size);
        return &table[index];
    } else {
        return nullptr;
    }
}
}  // namespace prv

template<typename T = T>
static const T* from(PARAMS Value::T value, bool check = true)
{
    ASSERT(T::checkType(value & Value::TypeMask));
    return (T*)prv::from(ARGS value);
}

struct Double: public Head::T
{
    // Double precision floating point value
    UnalignedDouble value;

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::Double;
    }
};

struct Symbol: public Head::T
{
    // Symbol description, must be Value::String
    Value::T description;

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::Symbol;
    }
};

struct Accessor: public Head::T
{
    // Getter function
    Value::T getter;
    // Setter functions
    Value::T setter;

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::Accessor;
    }
};

struct Scope: public Head::T
{
    // Scope values
    Value::T values[2];

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::Scope;
    }
};

struct NativeHead: public Head::T
{
    uint8_t nativeBlock[8];

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::NativeHead;
    }
};

struct WithBlock: public Head::T
{
    Value::T tag;
    void* blockPointer;

    static constexpr bool checkType(Value::T type)
    {
        return type >= Value::FirstTypeWithBlock;
    }
};

namespace prv {
template<typename T, Value::T t>
struct WithBlockTemplate: public Head::WithBlock
{
    T &getBlock()
    {
        return *(T*)blockPointer;
    }

    static constexpr bool checkType(Value::T type)
    {
        return type == t;
    }
};
}  // namespace prv

using Object = prv::WithBlockTemplate<Block::Object, Value::Object>;
using String = prv::WithBlockTemplate<Block::String, Value::String>;
using BigInt = prv::WithBlockTemplate<Block::BigInt, Value::BigInt>;
using NativeBlock = prv::WithBlockTemplate<Block::NativeBlock, Value::NativeBlock>;

};  // namespace Head

static const AccessFunctionTable* accessFunctionTableByType[Value::FirstTypeWithBlock] = {
    nullptr,  // None
    nullptr,  // Boolean
    nullptr,  // Integer
    nullptr,  // FinallyHandler
    nullptr,  // Double
    nullptr,  // Symbol
    nullptr,  // Accessor
    nullptr,  // Scope
    nullptr,  // NativeHead
};

const AccessFunctionTable &Value::getAccessFunctionTable(PARAMS Value::T value)
{
    let type = Value::getType(value);
    if (type < Value::FirstTypeWithBlock) {
        return *accessFunctionTableByType[type];
    } else {
        let block = Value::getBlock<Block::T>(ARGS value);
        return *block->access;
    }
}

template<typename T>
T* Value::getHead(PARAMS Value::T value)
{
    let type = Value::getType(value);
    return nullptr;  // TODO: implement this
}

int main()
{
    return 0;
}
