#ifndef BLOCK_HPP
#define BLOCK_HPP

#include "Common.hpp"
#include "Block-forward.hpp"  // Added forward header inclusion
#include "Access-forward.hpp"

namespace mues {
namespace Block {

struct Base
{
    uint32_t headIndex;
    const Access::Table* access;
};

struct Object: public Block::Base
{
};

struct String: public Block::Base
{
};

struct BigInt: public Block::Base
{
};

using NativeBlock = Block::Base;

namespace prv {
Block::Base* from(MUES_PARAMS Value::T value);
Block::Base* from(MUES_PARAMS Head::WithBlock* head);

template<typename T>
struct HeadToBlockTypeConverter
{
};

template<>
struct HeadToBlockTypeConverter<Head::WithBlock>
{
    using T = Block::Base;
};

template<>
struct HeadToBlockTypeConverter<Head::Object>
{
    using T = Block::Object;
};

template<>
struct HeadToBlockTypeConverter<Head::String>
{
    using T = Block::String;
};

template<>
struct HeadToBlockTypeConverter<Head::BigInt>
{
    using T = Block::BigInt;
};

template<>
struct HeadToBlockTypeConverter<Head::NativeBlock>
{
    using T = Block::NativeBlock;
};

}  // namespace prv

template<typename T = Block::Base>
T* from(MUES_PARAMS Value::T value)
{
    return (T*)prv::from(MUES_ARGS value);
}

template<typename T>
typename prv::HeadToBlockTypeConverter<T>::T* from(MUES_PARAMS T* head)
{
    return (typename prv::HeadToBlockTypeConverter<T>::T*)prv::from(MUES_ARGS head);
}

}  // namespace Block
}  // namespace mues

#endif  // BLOCK_HPP
