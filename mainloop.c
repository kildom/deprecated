
#include <stdio.h>

#include "interface.h"

static int j=0;

void mainLoop()
{
    int i;
    initConfig(&j - 1, 8);
    j = 0;
    while (!stopRequested())
    {
        if (j == 0) {
            uint32_t t = getTime();
            if ((t & 0x3000) == 0x0000)
            {
                setRelay(RELAY_MINUS, 1);
            }
            if ((t & 0x3000) == 0x1000)
            {
                setRelay(RELAY_MINUS, 0);
            }
            if ((t & 0x3000) == 0x2000)
            {
                setRelay(RELAY_PLUS, 1);
            }
            if ((t & 0x3000) == 0x3000)
            {
                setRelay(RELAY_PLUS, 0);
            }
            printf("\r%d", t);
            setDisplay(0, (t/1000) % 10);
            setDisplay(1, ((t/100) % 10) | (CHAR_WITH_DOT * (t/2000%2)));
        }
        j = (j + 1) & 0xFF;
        for (i = 0; i < 3; i++)
        {
            if (getButtonPulse(i))
            {
                printf("PULSE %d\n", i);
                saveConfig(4, 4);
            }
        }
    }
}
