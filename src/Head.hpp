#ifndef HEAD_HPP
#define HEAD_HPP

#include "Common.hpp"
#include "Value.hpp"
#include "UnalignedDouble.hpp"
#include "Head-forward.hpp"
#include "Block.hpp"

namespace mues {
namespace Head {

namespace prv {

struct Parent
{
#if MUES_GC_REFCOUNTING
    uint32_t refCounter;
#endif
#if MUES_GC_TRACING && MUES_GC_INCREMENTAL
    uint32_t flags;
#endif
};

static const prv::Parent* from(MUES_PARAMS Value::T value, bool check)
{
    if (!check) {
        const prv::Parent* table = nullptr;
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
    } else {
        return nullptr;
    }
}

}  // namespace prv

struct Base: public prv::Parent
{
    int8_t _reserved[MUES_ARCH_32 ? 8 : 12];

    static constexpr bool checkType(Value::T type)
    {
        return type >= Value::FirstTypeWithHead;
    }
};

template<typename TT = prv::Parent>
static inline const TT* from(MUES_PARAMS Value::T value, bool check = true)
{
    MUES_ASSERT(TT::checkType(value & Value::TypeMask));
    return (TT*)prv::from(MUES_ARGS value, check);
}

struct Double: public prv::Parent
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

struct Symbol: public prv::Parent
{
    // Symbol description, must be Value::String
    Value::T description;
    uint32_t _reserved[MUES_ARCH_32 ? 1 : 2];

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::Symbol;
    }
};

struct Accessor: public prv::Parent
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

struct Scope: public prv::Parent
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

struct NativeHead: public prv::Parent
{
    uint8_t nativeBlock[MUES_ARCH_32 ? 8 : 12];

    static constexpr bool checkType(Value::T type)
    {
        return type == Value::NativeHead;
    }
};

struct WithBlock: public prv::Parent
{
    uint32_t tag;
    void* blockPointer;

    static constexpr bool checkType(Value::T type)
    {
        return type >= Value::FirstTypeWithBlock;
    }
};

namespace prv {

template<typename TT, Value::T expectedType>
struct WithBlockTemplate: public Head::WithBlock
{
    TT &getBlock()
    {
        return *(TT*)blockPointer;
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


static_assert((MUES_ARCH_32 ? 12 : 16) == sizeof(Base),
    "Head::Base must be 12 bytes on 32-bit and 16 bytes on 64-bit architecture");
static_assert(sizeof(Double) == sizeof(Base), "Head::Double must be the same size as Head::Base");
static_assert(sizeof(Symbol) == sizeof(Base), "Head::Symbol must be the same size as Head::Base");
static_assert(sizeof(Accessor) == sizeof(Base), "Head::Accessor must be the same size as Head::Base");
static_assert(sizeof(Scope) == sizeof(Base), "Head::Scope must be the same size as Head::Base");
static_assert(sizeof(NativeHead) == sizeof(Base), "Head::NativeHead must be the same size as Head::Base");
static_assert(sizeof(WithBlock) == sizeof(Base), "Head::WithBlock must be the same size as Head::Base");
static_assert(sizeof(Object) == sizeof(Base), "Head::Object must be the same size as Head::Base");
static_assert(sizeof(String) == sizeof(Base), "Head::String must be the same size as Head::Base");
static_assert(sizeof(BigInt) == sizeof(Base), "Head::BigInt must be the same size as Head::Base");
static_assert(sizeof(NativeBlock) == sizeof(Base), "Head::NativeBlock must be the same size as Head::Base");


}  // namespace Head
}  // namespace mues

#endif  // HEAD_HPP
