/*
 * Copyright 2025 Dominik Kilian
 *
 * Redistribution and use in source and binary forms,  with or without modification, are permitted provided
 * that the following conditions are met:
 * 1. Redistributions  of source code must retain  the above copyright notice,  this list of conditions and
 *    the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 *    the following disclaimer in the documentation  and/or other materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED  BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS  "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING,  BUT NOT LIMITED TO,  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT,  INDIRECT,  INCIDENTAL,  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL DAMAGES (INCLUDING,  BUT NOT
 * LIMITED TO,  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;  LOSS OF USE,  DATA,  OR PROFITS;  OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,  WHETHER IN CONTRACT,  STRICT LIABILITY, OR
 * TORT  (INCLUDING NEGLIGENCE OR OTHERWISE)  ARISING IN ANY WAY OUT  OF THE USE OF THIS SOFTWARE,  EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/*
 * SpiderMonkey uses posix_memalign to allocate mostly 1MB chunks of memory with 1MB of alignment.
 * The dlmalloc allocator implementation from wasilibc generates a lot of fragmentation
 * when allocating with big alignment. It uses almost two times more memory than requested.
 * The gaps can be filled with smaller unaligned allocation, but it is not enough to overcome
 * this problem.
 *
 * This allocator allocates 8MB blocks of memory containing 8 chunks of 1MB each
 * aligned to 1MB. On heap memory, it generates only a 1MB gap between 8MB blocks, making it
 * more efficient, and smaller allocations can fill those gaps better.
 * 
 * If the VM requests something different than 1MB of memory with 1MB of alignment, the allocator
 * returns nullptr which will cause fallback to default allocator.
 */

#include <stdint.h>
#include <malloc.h>
#include <stdlib.h>

static_assert(sizeof(void*) == 4, "This works only on 32-bit systems.");

#define SBOX_CHUNK_SIZE (1024 * 1024)
#define SBOX_BLOCK_CHUNKS (8)
#define SBOX_BLOCK_MASK 0xFF
#define SBOX_BLOCK_SIZE (SBOX_BLOCK_CHUNKS * SBOX_CHUNK_SIZE)

struct SboxBlock
{
    uint32_t freeBitmap;
    uintptr_t startAddress;
    SboxBlock* next;
};

static SboxBlock* blocksMap[0x80000000 / SBOX_CHUNK_SIZE * 2];
static SboxBlock* nextFreeBlock = nullptr;

void* sboxAlloc(uint32_t alignment, uint32_t size)
{
    // Check if alignment and size are valid
    if (alignment != SBOX_CHUNK_SIZE || size != SBOX_CHUNK_SIZE) {
        return nullptr;
    }

    uint32_t chunkLocalIndex;
    if (!nextFreeBlock) {
        // Allocate a new block
        void* blockBuffer = nullptr;
        if (posix_memalign(&blockBuffer, SBOX_CHUNK_SIZE, SBOX_BLOCK_SIZE) || !blockBuffer) {
            return nullptr;
        }
        nextFreeBlock = (SboxBlock*)malloc(sizeof(SboxBlock));
        if (!nextFreeBlock) {
            free(blockBuffer);
            return nullptr;
        }
        uint32_t byteAddress = (uintptr_t)blockBuffer;
        uint32_t chunkGlobalIndex = byteAddress / SBOX_CHUNK_SIZE;
        nextFreeBlock->startAddress = byteAddress;
        nextFreeBlock->freeBitmap = SBOX_BLOCK_MASK;
        nextFreeBlock->next = nullptr;
        for (uint32_t i = 0; i < SBOX_BLOCK_CHUNKS; i++) {
            blocksMap[chunkGlobalIndex + i] = nextFreeBlock;
        }
        chunkLocalIndex = 0;
    } else {
        // There is a block containing free chunks (at least one free and at least one allocated).
        chunkLocalIndex = __builtin_ctz(nextFreeBlock->freeBitmap);
    }
    void* result = (void*)(nextFreeBlock->startAddress + chunkLocalIndex * SBOX_CHUNK_SIZE);
    nextFreeBlock->freeBitmap &= ~(1 << chunkLocalIndex);
    if (nextFreeBlock->freeBitmap == 0) {
        // All chunks in the block are allocated, remove it from the list.
        nextFreeBlock = nextFreeBlock->next;
    }
    return result;
}

bool sboxFree(void* ptr)
{
    // Get indexes and associated block
    uint32_t byteAddress = (uintptr_t)ptr;
    uint32_t chunkGlobalIndex = byteAddress / SBOX_CHUNK_SIZE;
    SboxBlock* block = blocksMap[chunkGlobalIndex];

    // If there is no block in this place, pointer was allocated by the system allocator.
    if (!block) {
        return false;
    }

    // Set free bit in block's bitmap
    uint32_t startChunkGlobalIndex = block->startAddress / SBOX_CHUNK_SIZE;
    uint32_t chunkLocalIndex = chunkGlobalIndex - startChunkGlobalIndex;
    uint32_t freeBitmapBefore = block->freeBitmap;
    block->freeBitmap |= (1 << chunkLocalIndex);

    if (freeBitmapBefore == 0) {
        // If before entire block was used, so it is free now and we need to add it to the free list.
        block->next = nextFreeBlock;
        nextFreeBlock = block;
        return true;
    } else if (block->freeBitmap != SBOX_BLOCK_MASK) {
        // There are still allocated chunks in the block, so it is already in the list, we don't need to do anything.
        return true;
    }

    // We need to deallocate the block, first remove it from the list.
    SboxBlock** pptrToSelf = &nextFreeBlock;
    while (*pptrToSelf) {
        if (*pptrToSelf == block) {
            // We found the block in the list, remove it.
            *pptrToSelf = block->next;
            break;
        }
        pptrToSelf = &(*pptrToSelf)->next;
    }

    // Remove from blocksMap
    for (uint32_t i = 0; i < SBOX_BLOCK_CHUNKS; i++) {
        blocksMap[startChunkGlobalIndex + i] = nullptr;
    }

    // Free the block
    free((void*)block->startAddress);
    free(block);

    return true;
}
