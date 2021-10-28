

static void timerInit()
{
    // 16000000 Hz / 256 = 31250 Hz   -->   0.016 ms / tick   -->   62.5 ticks / ms
    // NRF_TIMER0->PRESCALER = 8; (default)
    // NRF_TIMER0->MODE = TIMER_MODE_MODE_Timer; (default)
    // NRF_TIMER0->BITMODE = TIMER_BITMODE_BITMODE_16Bit << TIMER_BITMODE_BITMODE_Pos; (default)
    NRF_TIMER0->INTENSET = TIMER_INTENSET_COMPARE0_Msk;
    // TODO: timer to reset values before entering app or second bootloader
}


static void timerReset(uint32_t time)
{
    NRF_TIMER0->TASKS_STOP = 1;
    NRF_TIMER0->CC[0] = time * 625;
    NRF_TIMER0->EVENTS_COMPARE[0] = 0;
    NRF_TIMER0->TASKS_START = 1;
}

static bool timerTimeout() {
    return NRF_TIMER0->EVENTS_COMPARE[0];
}

