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

template<uint64_t T_MASK>
struct CheckedValue
{
    static constexpr uint64_t MASK = T_MASK;
    // The type is plain 32-bit type, so it can be also used everywhere Value::T (uint32_t) is used.
    uint32_t value;

    // CheckedValue(); use default: value will be uninitialized as in production build
    CheckedValue(const CheckedValue&);

    // When converting from uint32_t assert that it is expected type
    CheckedValue(uint32_t);
    CheckedValue operator=(uint32_t);

    // When converting from other CheckedValue assert that:
    // * it is expected type
    // * OTHER_MASK & ~MASK == 0 // other type is not wider that current
    template<uint64_t OTHER_MASK> requires is_assignable(T_MASK, OTHER_MASK) // C++20 only
    CheckedValue(const CheckedValue<OTHER_MASK>& other);
    // C++17: template <uint64_t OTHER_MASK, typename = std::enable_if_t<is_assignable(T_MASK, OTHER_MASK)>>
    template<uint64_t OTHER_MASK> requires is_assignable(T_MASK, OTHER_MASK)
    CheckedValue operator=(const CheckedValue<OTHER_MASK>& other);

    // Nothing to check if converting to uint32_t
    operator uint32_t() const;
};

// Remove bits from current type
#if TYPE_ASSERTS
template<uint64_t T_MASK>
CheckedValue<T_MASK & ~(1 << 2)> removeBoolean(const CheckedValue<T_MASK>& value);
template<uint64_t T_MASK>
CheckedValue<T_MASK & ~(1 << 18)> removeException(const CheckedValue<T_MASK>& value);
// ...
#else
static inline constexpr uint32_t removeBoolean(uint32_t x) { return x; }
static inline constexpr uint32_t removeException(uint32_t x) { return x; }
// ...
#endif

template<int X, uint64_t MASK>
struct Dummy
{
};

template<uint64_t MASK>
struct Dummy<0, MASK>
{
private:

    template<int X, uint64_t Y>
    struct TypeContainer: public Dummy<X, Y>
    {
        #if TYPE_ASSERTS
        template <uint64_t OTHER_MASK>
        static CheckedValue<OTHER_MASK & ~Y> remove(const CheckedValue<OTHER_MASK>&);
        #else
        static inline constexpr uint32_t remove(uint32_t x) { return x; }
        #endif
    };

public:

#if TYPE_ASSERTS
    using T = CheckedValue<MASK>;
#else
    using T = uint32_t;
#endif
    using AnyJs = TypeContainer<0, MASK | (/* more flags */1 << 0)>;
    using None = TypeContainer<0, MASK | (1 << 1)>;
    using Boolean = TypeContainer<0, MASK | (1 << 2)>;
    using Integer = TypeContainer<0, MASK | (1 << 3)>;
    using FinallyHandler = TypeContainer<0, MASK | (1 << 4)>;
    using Double = TypeContainer<0, MASK | (1 << 5)>;
    using Symbol = TypeContainer<0, MASK | (1 << 6)>;
    using Accessor = TypeContainer<0, MASK | (1 << 7)>;
    using Scope = TypeContainer<0, MASK | (1 << 8)>;
    using NativeHead = TypeContainer<0, MASK | (1 << 9)>;
    using Object = TypeContainer<0, MASK | (1 << 10)>;
    using String = TypeContainer<0, MASK | (1 << 11)>;
    using BigInt = TypeContainer<0, MASK | (1 << 12)>;
    using NativeBlock = TypeContainer<0, MASK | (1 << 13)>;
    using Empty = TypeContainer<0, MASK | (1 << 14)>;
    using EndOfList = TypeContainer<0, MASK | (1 << 15)>;
    using Undefined = TypeContainer<0, MASK | (1 << 16)>;
    using Null = TypeContainer<0, MASK | (1 << 17)>;
    using Exception = TypeContainer<0, MASK | (1 << 18)>;
};

using Variant = prv::Dummy<0, 0>;

}  // namespace prv



using AnyJs = prv::Variant::AnyJs; // any valid JS value, except e.g. FinallyHandler, Exception, EndOfList, ...
using None = prv::Variant::None;
using Boolean = prv::Variant::Boolean;
using Integer = prv::Variant::Integer;
using FinallyHandler = prv::Variant::FinallyHandler;
using Double = prv::Variant::Double;
using Symbol = prv::Variant::Symbol;
using Accessor = prv::Variant::Accessor;
using Scope = prv::Variant::Scope;
using NativeHead = prv::Variant::NativeHead;
using Object = prv::Variant::Object;
using String = prv::Variant::String;
using BigInt = prv::Variant::BigInt;
using NativeBlock = prv::Variant::NativeBlock;
using Empty = prv::Variant::Empty;
using EndOfList = prv::Variant::EndOfList;
using Undefined = prv::Variant::Undefined;
using Null = prv::Variant::Null;
using Exception = prv::Variant::Exception;


Exception::Boolean::T getReady();
Exception::Integer::T getValue();

template<uint64_t MASK> requires (MASK & (1 << 18)) // Type must also contain Exception
bool isException(CheckedValue<MASK> value);

namespace Value {
    prv::Variant::None::T None(0);
    prv::Variant::Null::T Null(0x20);
    bool getBool(Boolean::T);
};

// TODO: Remove Variant prefix, so use only Exception::Integer::Null::T
// This can be done by defining all type as alias, e.g. use Exception = Variant::Exception
Exception::Integer::Null::T example() {
    // BT - build-time assert
    // RT - run-time assert
    auto isReady = getReady(); // getReady returns Exception::Boolean and isReady will have that type
    if (isException(isReady)) { // "if exception", RT: if value==None, assert that exception is set, BT: type has Exception
        return Value::None;
    }
    auto isReadyNoEx = Exception::remove(isReady); // BT: type has exception, RT: if value is None, check if it is allowed by resulting type
    if (Value::getBool(isReadyNoEx)) { // BT: Check if type is exactly Boolean, RT: Check if type is Boolean
        return getValue(); // BT: Check if getValue return value is type or subtype of this function return value, RT: The same check
    } else {
        return Value::Null; // BT: Check if Null can be returned
    }
}

}  // namespace mues

#endif  // VALUE_HPP
