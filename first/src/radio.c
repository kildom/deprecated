
#define BASE_ADDRESS 0x4F8CD4D6
#define SEND_ADDRESS 0xEB
#define RECV_ADDRESS 0x9B

__attribute__((aligned(4)))
typedef struct {
    uint16_t blockIndex;
    uint8_t content[32];
    uint16_t padding;
} RadioPacket;


__attribute__((aligned(4)))
static RadioPacket swappingBuffers[2];
static uint32_t bufferIndex = 0;

static RadioPacket *packet;

static void assertEvent(volatile uint32_t *reg)
{
	while (!*reg);
	*reg = 0;
}

static void radioInit()
{
	NRF_RADIO->POWER = 1;
	NRF_RADIO->SHORTS = RADIO_SHORTS_READY_START_Msk | RADIO_SHORTS_END_DISABLE_Msk;
	NRF_RADIO->INTENSET = RADIO_INTENSET_DISABLED_Msk;
	NRF_RADIO->PACKETPTR = (uint32_t)&bootConf;
	NRF_RADIO->FREQUENCY = bootConf.frequency;
	NRF_RADIO->TXPOWER = RADIO_TXPOWER_TXPOWER_Pos4dBm;
	NRF_RADIO->MODE = RADIO_MODE_MODE_Ble_1Mbit;
	//NRF_RADIO->PCNF0 = zeros (default)
	NRF_RADIO->PCNF1 =
		(15 << RADIO_PCNF1_MAXLEN_Pos) |
		(15 << RADIO_PCNF1_STATLEN_Pos) |
		(4 << RADIO_PCNF1_BALEN_Pos) |
		(RADIO_PCNF1_ENDIAN_Little << RADIO_PCNF1_ENDIAN_Pos) |
		(RADIO_PCNF1_WHITEEN_Disabled << RADIO_PCNF1_WHITEEN_Pos);
	NRF_RADIO->BASE1 = BASE_ADDRESS;
	NRF_RADIO->PREFIX0 =
		(SEND_ADDRESS << RADIO_PREFIX0_AP1_Pos) |
		(RECV_ADDRESS << RADIO_PREFIX0_AP2_Pos);
	NRF_RADIO->TXADDRESS = 1;
	NRF_RADIO->RXADDRESSES = RADIO_RXADDRESSES_ADDR2_Msk;
	NRF_RADIO->CRCCNF = (3 << RADIO_CRCCNF_LEN_Pos);
	NRF_RADIO->CRCPOLY = 0x864CFB; // CRC-24 from OpenPGP
}

static void radioSwitchToRecv()
{
	NRF_RADIO->SHORTS = RADIO_SHORTS_READY_START_Msk;
	NRF_RADIO->PCNF1 =
		(34 << RADIO_PCNF1_MAXLEN_Pos) |
		(34 << RADIO_PCNF1_STATLEN_Pos) |
		(4 << RADIO_PCNF1_BALEN_Pos) |
		(RADIO_PCNF1_ENDIAN_Little << RADIO_PCNF1_ENDIAN_Pos) |
		(RADIO_PCNF1_WHITEEN_Disabled << RADIO_PCNF1_WHITEEN_Pos);
	NRF_RADIO->PACKETPTR = (uint32_t)&swappingBuffers[bufferIndex];
	bufferIndex ^= 1;
    NRF_RADIO->TASKS_RXEN = 1;
	assertEvent(&NRF_RADIO->EVENTS_READY);
}

static bool radioRecv()
{
    if (!NRF_RADIO->EVENTS_END) {
        return false;
    }
    NRF_RADIO->PACKETPTR = (uint32_t)&swappingBuffers[bufferIndex];
    NRF_RADIO->TASKS_START = 1;
    bufferIndex ^= 1;
    packet = &swappingBuffers[bufferIndex];
    return true;
}

static void sendBootPacket()
{
	NRF_RADIO->TASKS_TXEN = 1;
	assertEvent(&NRF_RADIO->EVENTS_DISABLED);
}
