#ifndef HEAD_HPP
#define HEAD_HPP

#include "Common.hpp"
#include "Value.hpp"
#include "UnalignedDouble.hpp"
#include "Head-forward.hpp"
#include "Block.hpp"

namespace mues {
namespace Head {

struct Base
{
    /** @brief GC flags that depends on GC algorithm.
     *
     * For Reference Counting Non-incremental GC it is:
     * - bit 31:   Zero.
     * - bit 4-30: Counter equal to number of references minus one.
     *             Decrementing in below zero (bit 31 set) triggers deletion.
     * - bit 0-4:  Type.
     *
     */
    // TODO: Head must contain a type field
    // It is required for tracing GC, maybe for incremental refcounting GC, or even for all.
    // When traveling on the heap, we need to know the type of the head to use correct access functions.
    int32_t flags;
};

struct Any: public Base
{
    int8_t _reserved[MUES_ARCH_32 ? 8 : 12];

    static constexpr bool checkType(Value::T type)
    {
        return type >= Value::FirstTypeWithHead;
    }
};

struct Double: public Base
{
    // Double precision floating point value
#if MUES_ARCH_32
    UnalignedDouble value;
#else
    uint32_t _reserved;
    double value;
#endif

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::Double;
    }
};

struct Symbol: public Base
{
    // Symbol description, must be Value::String
    Value::T description;
    uint32_t _reserved[MUES_ARCH_32 ? 1 : 2];

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::Symbol;
    }
};

struct Accessor: public Base
{
    // Getter function
    Value::T getter;
    // Setter functions
    Value::T setter;
#if MUES_ARCH_64
    uint32_t _reserved;
#endif

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::Accessor;
    }
};

struct Scope: public Base
{
    // Scope values
    Value::T values[2];
#if MUES_ARCH_64
    uint32_t _reserved;
#endif

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::Scope;
    }
};

struct NativeHead: public Base
{
    uint8_t nativeBlock[MUES_ARCH_32 ? 8 : 12];

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::NativeHead;
    }
};

struct WithBlock: public Base
{
    uint32_t tag;
    void* blockPointer;

    static constexpr bool checkType(Value::T type)
    {
        return type >= Value::FirstTypeWithBlock;
    }
};

namespace prv {

template<typename T, Value::T expectedType>
struct WithBlockTemplate: public Head::WithBlock
{
    T &getBlock()
    {
        return *(T*)blockPointer;
    }

    static constexpr bool checkType(Value::T type)
    {
        return type == expectedType;
    }
};

}  // namespace prv

using Object = prv::WithBlockTemplate<Block::Object, Value::Object>;
using String = prv::WithBlockTemplate<Block::String, Value::String>;
using BigInt = prv::WithBlockTemplate<Block::BigInt, Value::BigInt>;
using NativeBlock = prv::WithBlockTemplate<Block::NativeBlock, Value::NativeBlock>;

namespace prv {

static const Base* fromNC(MUES_PARAMS Value::T value)
{
    const Base* table = nullptr;
    uint32_t index;
    if (value & Value::RomFlag) {
        // table = (value & Value::EngineFlag) ? engineHeadsTable : instance.romHeadsTable;
        index = value >> Value::RomHeadIndexShift;
    } else {
        // table = instance.heapHeadsTable;
        index = value >> Value::HeapHeadIndexShift;
    }
    MUES_ASSERT(index < ((uint32_t*)table)[-1]);  // TODO: This should be `HeadsTableHeader` instead of `uint32_t`.
    return &table[index];
}

}  // namespace prv

template<typename T = Any>
static inline const T* fromNC(MUES_PARAMS Value::T value)
{
    MUES_ASSERT(T::checkType(value & Value::TypeMask));
    return (T*)prv::fromNC(MUES_ARGS value);
}

static inline Value::T getType(const Base* head)
{
    if (MUES_GC_INCREMENTAL) {
        return (head->flags >> 1) & Value::TypeMask;
    } else {
        return head->flags & Value::TypeMask;
    }
}

static_assert((MUES_ARCH_32 ? 12 : 16) == sizeof(Any),
    "Head::Base must be 12 bytes on 32-bit and 16 bytes on 64-bit architecture");
static_assert(sizeof(Double) == sizeof(Any), "Head::Double must be the same size as Head::Base");
static_assert(sizeof(Symbol) == sizeof(Any), "Head::Symbol must be the same size as Head::Base");
static_assert(sizeof(Accessor) == sizeof(Any), "Head::Accessor must be the same size as Head::Base");
static_assert(sizeof(Scope) == sizeof(Any), "Head::Scope must be the same size as Head::Base");
static_assert(sizeof(NativeHead) == sizeof(Any), "Head::NativeHead must be the same size as Head::Base");
static_assert(sizeof(WithBlock) == sizeof(Any), "Head::WithBlock must be the same size as Head::Base");
static_assert(sizeof(Object) == sizeof(Any), "Head::Object must be the same size as Head::Base");
static_assert(sizeof(String) == sizeof(Any), "Head::String must be the same size as Head::Base");
static_assert(sizeof(BigInt) == sizeof(Any), "Head::BigInt must be the same size as Head::Base");
static_assert(sizeof(NativeBlock) == sizeof(Any), "Head::NativeBlock must be the same size as Head::Base");


}  // namespace Head
}  // namespace mues

#endif  // HEAD_HPP
