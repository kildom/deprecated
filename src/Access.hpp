#ifndef ACCESS_HPP
#define ACCESS_HPP

#include "Common.hpp"
#include "Value.hpp"
#include "Head.hpp"
#include "Block.hpp"
#include "Access-forward.hpp"  // Added forward header inclusion

namespace mues {
namespace Access {

struct Table
{
    // GC related callbacks
    void (*walk)(MUES_PARAMS Head::Base* head);
    bool (*dispose)(MUES_PARAMS Head::Base* head);
    // Proxy-like callbacks
    Variant::Exception::Any::T (*getPrototypeOf)(MUES_PARAMS Value::T obj);
    Variant::Exception::Boolean::T (*setPrototypeOf)(MUES_PARAMS Value::T obj, Value::T proto);
    Variant::Exception::Boolean::T (*isExtensible)(MUES_PARAMS Value::T obj);
    Variant::Exception::Boolean::T (*preventExtensions)(MUES_PARAMS Value::T obj);
    Variant::Exception::Object::Undefined::T (*getOwnPropertyDescriptor)(
        MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property);
    Variant::Exception::Object::Undefined::T (*defineProperty)(
        MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property, Value::ObjectT descriptor);
    Variant::Exception::Boolean::T (*has)(MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property);
    Variant::Exception::Any::T (*get)(
        MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property, Value::T receiver);
    Variant::Exception::Boolean::T (*set)(MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property,
        Value::T value, Value::T receiver);
    Variant::Exception::Boolean::T (*deleteProperty)(
        MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property);
    Variant::Exception::Object::T (*ownKeys)(MUES_PARAMS Value::T obj);
    Variant::Exception::Any::T (*apply)(MUES_PARAMS Value::T obj);  // arguments and "this" are passed over the stack
    Variant::Exception::Object::T (*construct)(
        MUES_PARAMS Value::T obj, Value::T newTarget);  // arguments are passed over the stack
    // Operators
    // TODO: Operators are probably not the best idea, because they are defined just for few types of operands.
    // for example, "-" is just for numbers and BigInts, other types are converted to numbers,
    // "+" is just for strings, numbers and BigInts.
    uint8_t binopPriorities[8];
    Value::T (*binop[8])(MUES_PARAMS Value::T obj, Value::T other);
};

// example

void instrBinOp(MUES_PARAMS int binopIndex)
{
    let a = instance.pop();
    let b = instance.pop();
    Access::Table aAccess = Access::fromNC(MUES_ARGS a);
    Access::Table bAccess = Access::fromNC(MUES_ARGS b);
    if (aAccess.binopPriorities[binopIndex] > bAccess.binopPriorities[binopIndex]) {
        aAccess.binop[binopIndex](MUES_ARGS a, b);
    } else {
        bAccess.binop[binopIndex](MUES_ARGS a, b);
    }
}

void instrAdd(MUES_NO_PARAMS)
{
    instrBinOp(MUES_ARGS 0);
}

void instrSub(MUES_NO_PARAMS)
{
    instrBinOp(MUES_ARGS 1);
}

const Access::Table* fromNC(MUES_PARAMS Value::T value);

const Access::Table* fromNC(MUES_PARAMS Head::Any* head);

static inline const Access::Table* fromNC(Block::Base* block)
{
    return block->access;
}

}  // namespace Access
}  // namespace mues

#endif  // ACCESS_HPP
