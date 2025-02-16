
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <math.h>
#include <vector>

#include "logdpcm.h"

extern "C" {
    #include "mdct.h"
    #include "window.h"
}

#define FRAME_SAMPLES_LOG2 8
#define FRAME_SAMPLES (1 << FRAME_SAMPLES_LOG2)

#define WINDOW_ID (FRAME_SAMPLES_LOG2 - 6)

int16_t input_frame_int[FRAME_SAMPLES];
float input_frame[FRAME_SAMPLES];
float output_frame[FRAME_SAMPLES / 2];
int window_winno[1] = { WINDOW_ID };
long window_blocksizes[1] = { FRAME_SAMPLES };
mdct_lookup mdct;
std::vector<std::vector<float>> spectrogram;

void to_color(float v, int& r, int& g, int& b) {
    r = v * 255.0f + 0.5;
    g = v * 255.0f + 0.5;
    b = v * 255.0f + 0.5;
    return;
    if (v < 0.5f) {
        if (v < 0.25f) {
            r = 0;
            g = 0;
            b = (int)(v * 4.0f * 255.0f);
        } else {
            r = 0;
            g = (int)((v - 0.25f) * 4.0f * 255.0f);
            b = 255;
        }
    } else {
        if (v < 0.75f) {
            r = (int)((v - 0.5f) * 4.0f * 255.0f);
            g = 255;
            b = (int)((0.75f - v) * 4.0f * 255.0f);
        } else {
            r = 255;
            g = (int)((1.0f - v) * 4.0f * 255.0f);
            b = 0;
        }
    }
}


int main() {

    
    //Experiment with faster calculating index during encoding
    /*std::vector<int> minTable;
    std::vector<int> maxTable;
    for (int i = 0; i < 65; i++) {
        minTable.push_back(1000000);
        maxTable.push_back(0);
    }
    int lastIndex = -1;
    std::vector<int> firstValues;
    firstValues.resize(128);
    for (int i = 0; i < firstValues.size(); i++) {
        firstValues[i] = i;
    }
    for (int value = 20; value < 32 * 1024; value++) {
        int index = indexFromValue(value);
        int index2 = indexFromValue2(value);
        if (lastIndex != index) {
            firstValues[index] = value;
            printf("--------------------------------------------------\n");
            lastIndex = index;
        }
        //int rangeIndex = 63 - __builtin_clzll((uint64_t)value * (uint64_t)value * (uint64_t)value * (uint64_t)value);
        int rangeIndex = 31 - __builtin_clz(value *value) - 8;
        if (index < minTable[rangeIndex]) minTable[rangeIndex] = index;
        if (index > maxTable[rangeIndex]) maxTable[rangeIndex] = index;
        printf("%5d -> %5d [%3d]  err=%4d     ", value, logTable[index], index, abs(value - logTable[index]));
        printf("\n");
        if (index != index2) {
            printf("ERROR: index %d, index2 %d\n", index, index2);
            exit(1);
        }
    }

    for (int i = 0; i < 32; i++) {
        printf("%2d %3d %3d   -> %3d\n", i, minTable[i], maxTable[i], maxTable[i] - minTable[i]);
    }

    for (int i = 0; i < 64; i++) {
        printf("    { %d, %d },\n", minTable[i], maxTable[i]);
    }

    for (int i = 0; i < firstValues.size(); i++) {
        printf(" %d,", firstValues[i]);
    }

    return 0;*/

    int16_t* input = new int16_t[512 * 1024];
    uint8_t* output = new uint8_t[512 * 1024];
    FILE* f = fopen("../input.raw", "rb");
    int samples = fread(input, sizeof(int16_t), 512 * 1024, f);
    fclose(f);

    int16_t state = 0;

    for (int i = 0; i < samples; i++) {
        output[i] = encodeSample(input[i], &state);
    }

    f = fopen("../output.logdpcm", "wb");
    fwrite(output, sizeof(uint8_t), samples, f);
    fclose(f);

    state = 0;

    for (int i = 0; i < samples; i++) {
        input[i] = decodeSampleSafe(output[i], &state);
    }

    f = fopen("../output.raw", "wb");
    fwrite(input, sizeof(int16_t), samples, f);
    fclose(f);
}

int main1() {
    FILE* f = fopen("../input.raw", "rb");

    int frame_num = 0;

    mdct_init(&mdct, FRAME_SAMPLES);

    fseek(f, FRAME_SAMPLES, SEEK_SET);

    // Copy first half of the first frame
    int n = fread(input_frame_int, sizeof(int16_t), FRAME_SAMPLES / 2, f);
    if (n < FRAME_SAMPLES / 2) return 0;
    for (int i = 0; i < FRAME_SAMPLES / 2; i++) {
        input_frame[i] = input_frame_int[i] / 32768.0f;
    }

    while (!feof(f) && frame_num < 4000) {

        // Read second half of the frame
        ///fseek(f, 100 * 2 * FRAME_SAMPLES + 2 * frame_num, SEEK_SET);
        int n = fread(&input_frame_int[FRAME_SAMPLES / 2], sizeof(int16_t), FRAME_SAMPLES / 2, f);
        if (n < FRAME_SAMPLES / 2) break;
        float ms = 0;

        // Convert to floating point
        for (int i = 0; i < FRAME_SAMPLES; i++) {
            input_frame[i] = input_frame_int[i] / 32768.0f;
            ms += input_frame[i] * input_frame[i];
        }

        // Copy second half to the first, so it will be used on the next frame
        memcpy(input_frame_int, &input_frame_int[FRAME_SAMPLES / 2], sizeof(input_frame_int[0]) * FRAME_SAMPLES / 2);

        // Apply window
        _vorbis_apply_window(input_frame, window_winno, window_blocksizes, 0, 0, 0);

        // Apply MDCT
        mdct_forward(&mdct, input_frame, output_frame);
        //memcpy(output_frame, input_frame, sizeof(output_frame));
        ms = sqrt(ms / FRAME_SAMPLES);

        // Copy to spectrogram
        spectrogram.push_back(std::vector<float>());
        spectrogram[frame_num].resize(FRAME_SAMPLES / 2);
        for (int i = 0; i < FRAME_SAMPLES / 2; i++) {
            auto x = output_frame[i];
            //spectrogram[frame_num][i] = log2(pow(fabs(x), 0.9f) + 0.00001f);
            spectrogram[frame_num][i] = sqrt(sqrt(fabs(x)));
            //if (x < 0) spectrogram[frame_num][i] = -spectrogram[frame_num][i];
        }

        //printf("Frame %d %f\n", frame_num, sqrt(ms / FRAME_SAMPLES));
        frame_num++;
    }

    fclose(f);
    mdct_clear(&mdct);

    f = fopen("../output.ppm", "w");

    float max = 0;
    float min = 0;
    for (auto frame : spectrogram) {
        for (auto v : frame) {
            if (v > max) max = v;
            if (v < min) min = v;
        }
    }

    printf("Max: %f\n", max);
    printf("Min: %f\n", min);

    /*P3
3 3
255
255 0 0   0 255 0   0 0 255
255 255 0 0 255 255 255 0 255
100 100 100 200 200 200 50 50 50*/

    fprintf(f, "P3\n%d %d\n255\n", (int)spectrogram.size(), FRAME_SAMPLES / 2);
    for (int y = 0; y < FRAME_SAMPLES / 2; y++) {
        for (int x = 0; x < (int)spectrogram.size(); x++) {
            float v = (spectrogram[x][FRAME_SAMPLES / 2 - y - 1] - min) / (max - min);
            int r, g, b;
            to_color(v, r, g, b);
            fprintf(f, "%d %d %d ", r, g, b);
        }
        fprintf(f, "\n");
    }
    fclose(f);

    return 0;
}
