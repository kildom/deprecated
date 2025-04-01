#include "Common.hpp"
#include "Access.hpp"

namespace mues {
namespace Access {


static const Access::Table* accessFunctionTableByType[Value::FirstTypeWithBlock] = {
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

const Access::Table* fromNC(MUES_PARAMS Value::T value)
{
    let type = Value::getType(value);
    if (type >= Value::FirstTypeWithBlock) {
        let block = Block::fromNC(MUES_ARGS value);
        return fromNC(MUES_ARGS block);
    } else {
        return accessFunctionTableByType[type];
    }
}

const Access::Table* fromNC(MUES_PARAMS Head::Any* head)
{
    let type = Head::getType(head);
    if (type >= Value::FirstTypeWithBlock) {
        let block = Block::fromNC(MUES_ARGS head);
        return fromNC(MUES_ARGS block);
    } else {
        return accessFunctionTableByType[type];
    }
}

}  // namespace Access
}  // namespace mues
