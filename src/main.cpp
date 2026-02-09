
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

#include <vector>
#include <algorithm>
#include <stack>

#include "floodFillMap.hh"

using dim = ssize_t;
using dim32 = int32_t;

static constexpr dim MAX_DIMENSION = 256 * 1024;
static constexpr dim MAX_PIXELS = sizeof(void*) == 8 ? 1024 * 1024 * 1024 :  256 * 1024 * 1024;

struct Head
{
    int32_t width;
    int32_t height;
    double pixelsPerMm;
    int32_t rowBytes;
    int32_t _reserved;
};

Head head;

struct Color
{
    uint8_t r;
    uint8_t g;
    uint8_t b;
};

struct Coordinate32
{
    dim32 x;
    dim32 y;
};

struct Coordinate
{
    dim x;
    dim y;
};

Color colorsMin[] = {
    { 230, 230, 230 }, // white - first item is always background color
    { 0, 0, 0 }, // black - normal milling
    { 220, 0, 0 }, // red - deep milling
};

Color colorsMax[] = {
    { 255, 255, 255 }, // white - first item is always background color
    { 30, 30, 30 }, // black - normal milling
    { 255, 30, 30 }, // red - deep milling
};

dim colorCount[sizeof(colorsMin) / sizeof(colorsMin[0])] = { 0 };

void bitmapToIndexes(uint8_t* pixels) {
    // Convert RGB bitmap to color indexes
    uint8_t* dst = pixels;
    for (dim y = 0; y < head.height; y++) {
        Color* src = (Color*)(pixels + y * head.rowBytes);
        uint8_t* dstEnd = dst + head.width;
        while (dst < dstEnd) {
            uint8_t r = src->r;
            uint8_t g = src->g;
            uint8_t b = src->b;
            src++;
            uint8_t index = 0; // default to background color
            for (size_t i = 0; i < sizeof(colorsMin) / sizeof(colorsMin[0]); i++) {
                if (colorsMin[i].r <= r && r <= colorsMax[i].r &&
                    colorsMin[i].g <= g && g <= colorsMax[i].g &&
                    colorsMin[i].b <= b && b <= colorsMax[i].b
                ) {
                    colorCount[i]++;
                    index = i;
                    break;
                }
            }
            *dst = index;
            dst++;
        }
    }
}

void processShape(uint8_t* pixels, dim x, dim y, uint8_t* temp)
{
    uint8_t bit;
    uint8_t value;
    dim height = head.height;
    dim width = head.width;
    uint8_t index = pixels[y * width + x];
    std::stack<Coordinate32> stack;
    dim minX = x;
    dim maxX = x;
    dim minY = y;
    dim maxY = y;
    do {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        uint8_t *ptr = &pixels[(x - 1) + (y - 1) * width];

        bit = ((*ptr++) == index);
        value = bit;
        bit = ((*ptr++) == index);
        value = (value << 1) | bit;
        bit = (*ptr == index);
        value = (value << 1) | bit;

        ptr += width - 2;

        bit = ((*ptr++) == index);
        value = (value << 1) | bit;
        (*ptr++) = 255;
        bit = (*ptr == index);
        value = (value << 1) | bit;

        ptr += width - 2;
        
        bit = ((*ptr++) == index);
        value = (value << 1) | bit;
        bit = ((*ptr++) == index);
        value = (value << 1) | bit;
        bit = (*ptr == index);
        value = (value << 1) | bit;

        FloodFillMapEntry* entry = &floodFillMap[value];

        if (entry->count == 1) {
            // Just move to the next pixel
            x += entry->jumps[0].dx;
            y += entry->jumps[0].dy;
        } else if (entry->count == 0) {
            if (stack.empty()) {
                // No more pixels here and no more pixels on stack, we are done
                break;
            } else {
                // No more pixels here but we have pixels on stack, pop next pixel from stack
                auto& coord = stack.top();
                x = coord.x;
                y = coord.y;
                stack.pop();
            }
        } else {
            // Multiple possible jumps, push all but the first one to stack and move to the first one
            for (uint8_t i = 1; i < entry->count; i++) {
                Coordinate32 coord;
                coord.x = x + entry->jumps[i].dx;
                coord.y = y + entry->jumps[i].dy;
                stack.push(coord);
            }
            x += entry->jumps[0].dx;
            y += entry->jumps[0].dy;
        }
        
    } while (true);

    dim shapeWidth = maxX - minX + 1;
    dim shapeHeight = maxY - minY + 1;
    dim shapeX = minX;
    dim shapeY = minY;

    printf("Shape at %dx%d => %dx%d (%dx%d)\n", (int)minX, (int)minY, (int)maxX, (int)maxY, (int)(maxX - minX + 1), (int)(maxY - minY + 1));

    //exit(0); // DEBUG
}


int main() {
    // Read head variable from "output.header" file
    FILE* headerFile = fopen("output.header", "rb");
    if (headerFile == nullptr) {
        perror("Error opening file");
        return 1; // Error opening file
    }
    int r = fread(&head, 1, sizeof(Head), headerFile);
    // Check if the read was successful
    if (r != sizeof(Head)) {
        perror("Error reading header file");
        fclose(headerFile);
        return 2; // Error reading file
    }
    fclose(headerFile);

    if (head.width <= 0 || head.width > MAX_DIMENSION
        || head.height <= 0 || head.height > MAX_DIMENSION
        || head.rowBytes > 4 * MAX_DIMENSION
        || dim(head.rowBytes) * dim(head.height) > MAX_PIXELS
        || head.pixelsPerMm <= 0.1 || head.pixelsPerMm > 100.0
    ) {
        fprintf(stderr, "Invalid header values: size=%dx%d (max %d), rowBytes=%d (max %d), pixels=%d (max %d), pixelsPerMm=%.2f (max %.2f)\n",
            head.width, head.height, (int)MAX_DIMENSION, head.rowBytes, 4 * (int)MAX_DIMENSION,
            dim(head.rowBytes) * dim(head.height), (int)MAX_PIXELS, head.pixelsPerMm, 100.0);
        return 3; // Invalid header values
    }

    uint8_t* pixels = (uint8_t*)malloc(dim(head.rowBytes) * dim(head.height));
    FILE* pixelsFile = fopen("output.bin", "rb");
    if (pixelsFile == nullptr) {
        perror("Error opening pixels file");
        free(pixels);
        return 4; // Error opening file
    }
    r = fread(pixels, 1, dim(head.rowBytes) * dim(head.height), pixelsFile);
    if (r != dim(head.rowBytes) * dim(head.height)) {
        perror("Error reading pixels file");
        fclose(pixelsFile);
        free(pixels);
        return 5; // Error reading file
    }
    fclose(pixelsFile);

    bitmapToIndexes(pixels);
    memset(pixels, 0, dim(head.width));
    memset(pixels + head.width * (head.height - 1), 0, dim(head.width));
    for (dim y = 0; y < head.height; y++) {
        pixels[y * head.width] = 0;
        pixels[y * head.width + head.width - 1] = 0;
    }

    // Dump color indexes to a PBM file for debugging
    uint8_t* temp = pixels + head.width * head.height;
    for (size_t i = 0; i < sizeof(colorsMin) / sizeof(colorsMin[0]); i++) {
        uint8_t* src = pixels;
        uint8_t* dst = temp;
        for (dim y = 0; y < head.height; y++) {
            for (dim x = 0; x < head.width; x++) {
                dst[0] = (*src == i) ? '1' : '0';
                dst[1] = ' ';
                src++;
                dst += 2;
            }
            dst[-1] = '\n';
        }
        char filename[64];
        snprintf(filename, sizeof(filename), "output_color_%d.pbm", (int)i);
        FILE* f = fopen(filename, "wb");
        fprintf(f, "P1\n# Index %d\n%d %d\n", (int)i, head.width, head.height);
        fwrite(temp, 1, head.width * head.height * 2, f);
        fclose(f);
    }

    for (dim y = 0; y < head.height; y++) {
        for (dim x = 0; x < head.width; x++) {
            uint8_t index = pixels[y * head.width + x];
            if ((uint8_t)(index - 1) < 128) {
                processShape(pixels, x, y, temp);
            }
        }
    }

    //pixels = (uint8_t*)realloc(pixels, head.width * head.height); // shrink to indexes size

    printf("Image size: %dx%d / %.2f pixels/mm = %.2f mm x %.2f mm\n",
        head.width, head.height, head.pixelsPerMm, head.width / head.pixelsPerMm, head.height / head.pixelsPerMm);

    printf("Image colors:\n");
    dim sum = 0;
    for (size_t i = 0; i < sizeof(colorsMin) / sizeof(colorsMin[0]); i++) {
        sum += colorCount[i];
        printf("  %d: %d pixels (color range: R %d-%d, G %d-%d, B %d-%d)\n",
            (int)i, colorCount[i],
            colorsMin[i].r, colorsMax[i].r,
            colorsMin[i].g, colorsMax[i].g,
            colorsMin[i].b, colorsMax[i].b
        );
    }
    printf("  ?: %d pixels (not matching any color - background)\n",
        (int)(dim(head.width) * dim(head.height) - sum));

    return 0;
}
