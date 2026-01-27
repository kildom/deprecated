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
    Any::Exception::T (*getPrototypeOf)(MUES_PARAMS Value::T obj);
    Boolean::Exception::T (*setPrototypeOf)(MUES_PARAMS Value::T obj, Value::T proto);
    Boolean::Exception::T (*isExtensible)(MUES_PARAMS Value::T obj);
    Boolean::Exception::T (*preventExtensions)(MUES_PARAMS Value::T obj);
    Object::Undefined::Exception::T (*getOwnPropertyDescriptor)(
        MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property);
    Object::Undefined::Exception::T (*defineProperty)(
        MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property, Value::ObjectT descriptor);
    Boolean::Exception::T (*has)(MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property);
    Any::Exception::T (*get)(
        MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property, Value::T receiver);
    Boolean::Exception::T (*set)(MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property,
        Value::T value, Value::T receiver);
    Boolean::Exception::T (*deleteProperty)(
        MUES_PARAMS Value::T obj, Value::Or<Value::StringT, Value::SymbolT> property);
    Object::Exception::T (*ownKeys)(MUES_PARAMS Value::T obj);
    Any::Exception::T (*apply)(MUES_PARAMS Value::T obj);  // arguments and "this" are passed over the stack
    Object::Exception::T (*construct)(
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
