
#include <stdio.h>

#include "interface.h"

void mainLoop()
{
    int i,j=0;
    while (1)
    {
        if (j == 0) {
            uint32_t t = getTime();
            printf("\r%d", t);
        }
        j = (j + 1) & 0xFFFFF;
        for (i = 0; i < 3; i++)
        {
            if (getButtonPulse(i))
            {
                printf("PULSE %d\n", i);
            }
        }
    }
}
