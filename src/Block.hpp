#ifndef BLOCK_HPP
#define BLOCK_HPP

#include "Common.hpp"
#include "Block-forward.hpp"  // Added forward header inclusion
#include "Access-forward.hpp"

namespace mues {
namespace Block {

struct T
{
    uint32_t headIndex;
    const Access::Table* access;
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
}  // namespace Block

}  // namespace mues

#endif  // BLOCK_HPP
