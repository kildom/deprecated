
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdlib.h>
#include <nrf.h>

#include "main.h"
#include "startup.h"

/* Including C files is a bad practice in general, but in this case
 * it gives better results than LTO. The first bootloader must be
 * as small as possible, so this approach looks justified.
 */
#include "utils.c"
#include "conf.c"
#include "startup.c"
#include "aes_dcfb.c"
#include "timer.c"
#include "radio.c"

#define FIRST_WAIT_TIME 10
#define WAIT_TIME 500

#define BLOCK_SIZE 32
#define BLOCKS (SECOND_BL_SIZE / BLOCK_SIZE)

static void blMain()
{
    timerInit();
    radioInit();

    do {
        timerReset(bootConf.counter & 3);
        sendBootPacket();
        while (!timerTimeout()) {
            yield();
        }
    } while (bootConf.counter--);

    radioSwitchToRecv();

    timerReset(FIRST_WAIT_TIME);
    while (true) {

        // Wait for received packet with timeout starting the application
        while (!radioRecv())
        {
            if (timerTimeout()) {
                startApp();
                __builtin_unreachable();
            }
            yield();
        }

        // Copy valid block to second bootloader area
        if (packet->blockIndex >= BLOCKS) {
            continue;
        }
        memCopy(secondBlArea + BLOCK_SIZE * packet->blockIndex, packet->content, BLOCK_SIZE);

        // On last block, verify and start if valid second bootloader
        if (packet->blockIndex == BLOCKS - 1) {
            aesDctf(secondBlArea, secondBlAreaEnd, secondBlAreaEnd - 16, 0, secondBlAreaEnd - 32);
            if (memZero(secondBlAreaEnd - 16, 16) == 0) {
                aesDctf(secondBlArea, secondBlAreaEnd, secondBlArea, 16, secondBlAreaEnd - 32);
                startSecondBl();
                __builtin_unreachable();
            }
        }

        timerReset(WAIT_TIME);
    }
}
