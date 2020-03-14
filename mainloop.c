
#include <stdio.h>

#include "interface.h"

static int j=0;

void mainLoop()
{
    int i;
    initConfig(&j - 1, 8);
    while (1)
    {
        if (j == 0) {
            uint32_t t = getTime();
            printf("\r%d", t);
            setDisplay(0, (t/1000) % 10);
            setDisplay(1, ((t/100) % 10) | (CHAR_WITH_DOT * (t/2000%2)));
        }
        j = (j + 1) & 0xFFFFF;
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
