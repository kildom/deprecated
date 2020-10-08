
#include <stdio.h>

#include "interface.h"

enum
{
    EV_PRESS,  // data = button
    EV_IDLE,   // data = sec
    EV_UPDATE, // no data
};

typedef struct Config_tag
{
    uint8_t t_min_poch;
} Config;

Config config = {
    .t_min_poch = 8,
};

int16_t diff = 0;

#define MASK_OK (1 << BUTTON_OK)
#define MASK_UP (1 << BUTTON_UP)
#define MASK_DOWN (1 << BUTTON_DOWN)

typedef void (*DisplayHandler)(uint8_t event, uint8_t data);

uint32_t t = 0;
uint32_t nextBtnTime = 1000;
uint16_t nextReport = 10;

void MainDisplay(uint8_t event, uint8_t data);
void FracDisplay(uint8_t event, uint8_t data);
void PochDisplay(uint8_t event, uint8_t data);

DisplayHandler display = MainDisplay;
DisplayHandler oldDisplay = MainDisplay;

uint8_t btnState = 0;

uint8_t icons = 0;

void processBtn()
{
    uint8_t i;
    for (i = 0; i < 3; i++)
    {
        if (getButtonPulse(i))
        {
            uint8_t mask = 1 << i;
            btnState ^= mask;
            nextBtnTime = t;
            nextReport = 0;
            if (btnState & mask)
            {
                display(EV_PRESS, i);
            }
        }
    }

    if (oldDisplay != display)
    {
        printf("Displ 0x%08X => 0x%08X\n", (uint32_t)(void *)oldDisplay, (uint32_t)(void *)display);
        oldDisplay = display;
        nextBtnTime = t;
        nextReport = 0;
        display(EV_UPDATE, 0);
    }

    if ((int32_t)nextBtnTime - (int32_t)t <= 0)
    {
        if (nextReport != 0)
        {
            display(EV_IDLE, nextReport);
        }
        if (!btnState)
        {
            nextBtnTime += 1000;
            nextReport += 10;
        }
        else if (nextReport < 30)
        {
            nextBtnTime += 400;
            nextReport += 4;
        }
        else if (nextReport < 80)
        {
            nextBtnTime += 200;
            nextReport += 2;
        }
        else
        {
            nextBtnTime += 100;
            nextReport += 1;
        }
    }
}

void resetIdle()
{
    if (!btnState)
    {
        nextBtnTime = t;
        nextReport = 0;
    }
}

void StdDisplayBase(uint8_t event, uint8_t data)
{
    switch (event)
    {
    case EV_IDLE:
        if (data == 100)
        {
            display = MainDisplay;
        }
        else if (data >= 50 && (btnState & MASK_OK))
        {
            display = StdDisplayBase; // TODO: NrParDisplay
        }
        break;
    case EV_UPDATE:
        //TODO: Pomp,
        break;

    default:
        break;
    }
}

void MainDisplay(uint8_t event, uint8_t data)
{
    //printf("Main %d %d\n", event, data);
    if (event == EV_PRESS)
    {
        if (data == BUTTON_OK)
        {
            display = FracDisplay;
        }
        else
        {
            display = PochDisplay;
        }
    }
    else if (event == EV_UPDATE)
    {
        uint16_t temp = getTemp() / 10;
        setDisplay(0, temp % 10);
        setDisplay(1, (temp / 10) % 10);
        icons |= ICON_DEG;
        setDisplay(2, icons);
    }
}

void FracDisplay(uint8_t event, uint8_t data)
{
    printf("Frac %d %d\n", event, data);
    StdDisplayBase(event, data);
    if (event == EV_PRESS)
    {
        if (data == BUTTON_OK)
        {
            display = MainDisplay;
        }
    }
    else if (event == EV_UPDATE)
    {
        setDisplay(0, CHAR_SPACE | CHAR_WITH_DOT);
        setDisplay(1, getTemp() % 10);
        icons |= ICON_DEG;
        setDisplay(2, icons);
    }
}

void PochDisplay(uint8_t event, uint8_t data)
{
    printf("Poch %d %d\n", event, data);
    //StdDisplayBase(event, data);
    if (event == EV_PRESS)
    {
        display = MainDisplay;
    }
    else if (event == EV_UPDATE)
    {
        uint8_t char0 = CHAR_WITH_DOT;
        uint8_t char1 = 0;
        int16_t d = diff;
        if (d > 99 || d < -99)
        {
            d /= 10;
            char0 = 0;
            char1 = CHAR_WITH_DOT;
        }
        setDisplay(0, char0 | ((d / 10) % 10));
        setDisplay(1, char1 | (d % 10));
        icons |= ICON_DEG;
        setDisplay(2, icons);
    }
}

struct
{
    uint8_t numAvg;
    uint16_t samplPeriod;
    uint8_t windowSize;
} samplingConfigs[10] = {
    // clang-format off
    { 4,  234, 21, },
    { 4,  234, 21, },
    { 9,  208, 24, },
    { 14, 200, 25, },
    { 16, 234, 21, },
    { 16, 292, 17, },
    { 16, 351, 14, },
    { 16, 410, 12, },
    { 16, 468, 10, },
    { 16, 527, 9,  },
    // clang-format on
}; 

typedef struct Window_tag
{
    uint8_t start;
    uint8_t size;
    uint16_t sum;
    uint16_t data[1];
} Window;

static uint16_t addToWindow(Window *win, uint16_t data, uint8_t size)
{

    if (win->size != size)
    {
        uint8_t i;
        win->start = 0;
        win->size = size;
        win->sum = 0;
        for (i = 0; i < size; i++)
        {
            win->data[i] = data;
            win->sum += data;
        }
        return data;
    }

    uint16_t old = win->data[win->start];
    win->data[win->start] = data;
    win->start++;
    if (win->start >= size)
    {
        win->start = 0;
    }
    win->sum -= old;
    win->sum += data;

    return old;
}

static uint32_t nextSample = 0;

void diffUpdate(uint16_t temp)
{
    const uint8_t numAvg = samplingConfigs[config.t_min_poch].numAvg;
    const uint16_t samplPeriod = samplingConfigs[config.t_min_poch].samplPeriod;
    const uint8_t windowSize = samplingConfigs[config.t_min_poch].windowSize;

    static uint16_t avgSum = 0;
    static uint8_t avgNum = 0;

    avgSum += temp;
    avgNum++;

    if (avgNum < numAvg)
    {
        return;
    }

    temp = (avgSum + avgNum / 2) / avgNum;
    avgSum = 0;
    avgNum = 0;

    static uint16_t winData[sizeof(Window) / 2 + 64] = {
        0,
        0,
    };
    static Window *const win = (Window *)&winData;

    addToWindow(win, temp, 64);

    uint16_t s0 = 64;                 // ∑ xk^0
    uint16_t s1 = (64 * 64 - 64) / 2; // ∑ xk^1
    uint32_t s2 = 85344;              // ∑ xk^2
    uint16_t t0 = win->sum;           // ∑ yk
    uint32_t t1 = 0;                  // ∑ yk * xk
    uint8_t x;
    for (x = 0; x < 64; x++)
    {
        uint8_t k = (win->start + x) & 63;
        uint16_t y = win->data[k];
        t1 += (uint32_t)x * (uint32_t)y;
    }
    int32_t W = ((int32_t)s0 * (int32_t)s2 - (int32_t)s1 * (int32_t)s1) * samplPeriod;
    int32_t Wa = (int32_t)t1 * (int32_t)s0 - (int32_t)t0 * (int32_t)s1;

    while (Wa > 35790LL || Wa < -35790LL)
    {
        Wa /= 2;
        W /= 2;
    }

    int32_t a = (Wa * 60000) / (W * numAvg);

    diff = a;

    display(EV_UPDATE, 0);
}

void processTemp()
{
    if ((int32_t)nextSample - (int32_t)t > 0)
        return;

    nextSample = t + samplingConfigs[config.t_min_poch].samplPeriod;

    uint16_t temp = getTemp();
    measureTemp();
    if (temp == 0)
        return;

    diffUpdate(temp);
    //tempUpdate(temp);  // TODO: Sliding window average (window size samplingCongig->windowSize)
}

void mainLoop()
{
    while (!stopRequested())
    {
        t = getTime();
        processTemp();
        processBtn();
    }
}
