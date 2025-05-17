
#include <stdint.h>
#include <malloc.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <errno.h>


#ifndef MOZ_ASSERT
#define MOZ_ASSERT(x) if (!(x)) { \
    fprintf(stderr, "Assertion failed: %s\n", #x); \
    exit(99); \
}
#endif


#define SBOX_CHUNK_SIZE (1024 * 1024)
#define SBOX_BLOCK_CHUNKS (16)
#define SBOX_BLOCK_MASK 0xFFFF
#define SBOX_BLOCK_SIZE (SBOX_BLOCK_CHUNKS * SBOX_CHUNK_SIZE)

struct SboxBlock {
    uint32_t freeBitmap;
    uintptr_t startAddress;
    SboxBlock* next;
};

static SboxBlock* blocksMap[0x80000000 / SBOX_CHUNK_SIZE * 2];
static SboxBlock* nextFreeBlock = nullptr;

static void* sboxAllocSystem(uint32_t alignment, uint32_t size) {
    void* region = nullptr;
    if (int err = posix_memalign(&region, alignment, size)) {
        MOZ_ASSERT(err == ENOMEM);
        (void)err;
        return nullptr;
    }
    return region;
}

void* sboxAlloc(uint32_t alignment, uint32_t size) {
    // Check if alignment and size are valid
    if (alignment != SBOX_CHUNK_SIZE || size != SBOX_CHUNK_SIZE) {
        void* ptr = sboxAllocSystem(alignment, size);
        printf("System alloc for 0x%08X 0x%08X => 0x%08X\n", alignment, size, intptr_t(ptr));
        if (ptr) {
            memset(ptr, 0, size);
        }
        return ptr;
    }

    uint32_t chunkLocalIndex;
    if (!nextFreeBlock) {
        // Allocate a new block
        void* blockBuffer = sboxAllocSystem(SBOX_CHUNK_SIZE, SBOX_BLOCK_SIZE);
        if (!blockBuffer) {
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
    memset(result, 0, SBOX_CHUNK_SIZE);
    return result;
}

void sboxFree(void* ptr) {
    // Get indexes and associated block
    uint32_t byteAddress = (uintptr_t)ptr;
    uint32_t chunkGlobalIndex = byteAddress / SBOX_CHUNK_SIZE;
    SboxBlock* block = blocksMap[chunkGlobalIndex];

    // If there is no block in this place, pointer was allocated by the system allocator.
    if (!block) {
        return free(ptr);
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
        return;
    } else if (block->freeBitmap != SBOX_BLOCK_MASK) {
        // There are still allocated chunks in the block, so it is already in the list, we don't need to do anything.
        return;
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
}


int main() {
    for (int i = 0; i < 24; i++) {
        void *ptr = sboxAlloc(SBOX_CHUNK_SIZE, SBOX_CHUNK_SIZE);
        printf("Allocated %d: 0x%08X\n", i, (uintptr_t)ptr);
        sboxFree(ptr);
    }
    return 0;
}

