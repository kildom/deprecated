
static void memCopy(void* dst, const void* src, size_t len)
{
	uint8_t* d = dst;
	const uint8_t* s = src;
	uint8_t* e = d + len;
	while (d < e) {
		*d++ = *s++;
	}
}

static uint8_t memZero(volatile void* dst, size_t len)
{
	volatile uint8_t* d = dst;
	volatile uint8_t* e = d + len;
	uint8_t r = 0;
	while (d < e) {
		r |= *d;
		*d++ = 0;
	}
	return r;
}

static void yield()
{
	__WFI();
}
