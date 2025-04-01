#ifndef VALUE_HPP
#define VALUE_HPP

#include "Common.hpp"
#include "Access-forward.hpp"
#include "Value-forward.hpp"  // Added forward header inclusion

namespace mues {
namespace Value {

using T = uint32_t;

// Simple head-less values
static constexpr Value::T None = 0x0;            ///< @brief No value - `Empty`, `EndOfList`, `Undefined` or `Null`.
static constexpr Value::T Boolean = 0x1;         ///< @brief JS `boolean` value - `True` or `False`.
static constexpr Value::T Integer = 0x2;         ///< @brief JS `number` value that fits into 28-bit signed integer.
static constexpr Value::T FinallyHandler = 0x3;  ///< @brief Special value put into the stack to call "finally"
                                                 ///< handlers during stack unwinding.
static constexpr Value::T NativeValue = 0x4;     ///< @brief Native specific value.

static constexpr Value::T Double = 0x5;      ///< @brief JS `number` value.
static constexpr Value::T Symbol = 0x6;      ///< @brief JS `symbol` value.
static constexpr Value::T Accessor = 0x7;    ///< @brief Value used in object properties to store getter/setter.
static constexpr Value::T Scope = 0x8;       ///< @brief Contains saved scope variables.
static constexpr Value::T NativeHead = 0x9;  ///< @brief Native specific head.

// Values with head and block
static constexpr Value::T Object = 0xA;       ///< @brief Normal JS object.
static constexpr Value::T String = 0xB;       ///< @brief JS `string` value.
static constexpr Value::T BigInt = 0xC;       ///< @brief JS `bigint` value.
static constexpr Value::T NativeBlock = 0xD;  ///< @brief Native specific block of data, e.g. array chunk.

// Aliases for type hints, for readability only, nothing is forced or checked when using them
using NoneT = T;
using BooleanT = T;
using IntegerT = T;
using FinallyHandlerT = T;
using DoubleT = T;
using SymbolT = T;
using AccessorT = T;
using ScopeT = T;
using NativeHeadT = T;
using ObjectT = T;
using StringT = T;
using BigIntT = T;
using NativeBlockT = T;
using EmptyT = T;
using EndOfListT = T;
using UndefinedT = T;
using NullT = T;

template<typename... TT>
using Or = T;

template<typename... TT>
using Exception = T;

// Bit access masks and shifts
static constexpr Value::T TypeMask = 0xF;
static constexpr Value::T ValueShift = 4;
static constexpr Value::T HeapHeadIndexShift = 8;
static constexpr Value::T RomHeadIndexShift = 9;

// Type categories
static constexpr Value::T FirstTypeWithHead = Value::Double;
static constexpr Value::T FirstTypeWithBlock = Value::Object;

// Special values
static constexpr Value::T Empty = 0x00;      ///< @brief Empty slot in object properties list,
                                             /// uninitialized variable, or return value indicating exception
static constexpr Value::T EndOfList = 0x10;  ///< @brief End of object properties list
static constexpr Value::T Undefined = 0x20;  ///< @brief `undefined` JS value
static constexpr Value::T Null = 0x30;       ///< @brief `null` JS value
static constexpr Value::T False = 0x01;      ///< @brief `false` JS value
static constexpr Value::T True = 0x11;       ///< @brief `true` JS value
static constexpr Value::T Zero = 0x02;       ///< @brief `0` JS value

// Flags
static const Value::T EngineFlag = 1 << 8;        ///< @brief Head is located in the engine ROM
static const Value::T RomFlag = 1 << 7;           ///< @brief Head is located in the ROM (engine or user)
static const Value::T EnumerableFlag = 1 << 6;    ///< @brief Enumerable property (only used in the object keys)
static const Value::T ConfigurableFlag = 1 << 5;  ///< @brief Configurable property (only used in the object keys)
static const Value::T WritableFlag = 1 << 4;      ///< @brief Writable property (only used in the object keys)

/// @brief Get the type of a value
static inline constexpr Value::T getType(Value::T value)
{
    return value & Value::TypeMask;
}

}  // namespace Value

namespace prv {

template<int X = 0>
struct Dummy
{
};

template<>
struct Dummy<0>
{
private:

    template<int X = 0>
    struct TypeContainer: public Dummy<X>
    {
    };

public:

    using T = unsigned;
    using Any = TypeContainer<0>;
    using None = TypeContainer<0>;
    using Boolean = TypeContainer<0>;
    using Integer = TypeContainer<0>;
    using FinallyHandler = TypeContainer<0>;
    using Double = TypeContainer<0>;
    using Symbol = TypeContainer<0>;
    using Accessor = TypeContainer<0>;
    using Scope = TypeContainer<0>;
    using NativeHead = TypeContainer<0>;
    using Object = TypeContainer<0>;
    using String = TypeContainer<0>;
    using BigInt = TypeContainer<0>;
    using NativeBlock = TypeContainer<0>;
    using Empty = TypeContainer<0>;
    using EndOfList = TypeContainer<0>;
    using Undefined = TypeContainer<0>;
    using Null = TypeContainer<0>;
    using Exception = TypeContainer<0>;
};

}  // namespace prv

using Variant = prv::Dummy<0>;

}  // namespace mues

#endif  // VALUE_HPP
