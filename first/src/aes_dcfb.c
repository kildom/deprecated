static void doXor(uint32_t* dst, const uint32_t* a, const uint32_t* b)
{
    size_t i;
    for (i = 0; i < 4; i++)
    {
        dst[i] = a[i] ^ b[i];
    }
}

static void doAes(uint32_t* data)
{
    NRF_ECB->ECBDATAPTR = (uint32_t)data;
    NRF_ECB->TASKS_STARTECB = 1;
    while (!NRF_ECB->EVENTS_ENDECB);
    NRF_ECB->EVENTS_ENDECB = 0;
}

static void aesDctfBlock(const uint32_t* input, uint32_t* output)
{
    memCopy(pt2, pt1, 16);
    doAes(key1);
    doAes(key2);
    doXor(pt1, ct1, input);
    doXor(output, ct2, pt1);
}

static void aesDctf(uint8_t* input, uint8_t* input_last, uint8_t* output, size_t output_step, const uint8_t* iv)
{
    memCopy(pt1, iv, 16);
    while (input < input_last)
    {
        aesDctfBlock((const uint32_t*)input, (uint32_t*)output);
        input += 16;
        output += output_step;
    }
}
