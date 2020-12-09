
#include "common.h"

typedef enum {
    GET_DEVICE_INFO = 0x00,
    GET_STATUS = 0x01,
    GET_HASH = 0x02,
    START_APP = 0x03,
    WRITE_BLOCK = 0x100,
} RequestType;

extern uint8_t __begin_ramapp;
extern uint8_t __end_ramapp;
static uint8_t blockBitmap[MAX_BLOCK_COUNT / 8];
static uint16_t blocksReceived = 0;

typedef struct
{
    uint16_t pagesAndAddrType;
    uint8_t blocksPerPage;
    uint8_t blocksRamApp;
    uint32_t deviveId[2];
    uint32_t addrLow;
    uint16_t addrHi;
    uint16_t hwid;
} DeviceInfoHeader;


static void sendDeviceInfo()
{
    uint8_t* buffer = getPacket();
    uint8_t* ptr = buffer;
    uint32_t blocks;
    DeviceInfoHeader header;

    ptr += 2;

    header.pagesAndAddrType = NRF_FICR->CODESIZE | ((NRF_FICR->DEVICEADDRTYPE & 1) << 15);
    header.blocksPerPage = NRF_FICR->CODEPAGESIZE / BLOCK_SIZE;
    blocks = (&__end_ramapp - &__begin_ramapp) / BLOCK_SIZE;
    header.blocksRamApp = blocks <= MAX_BLOCK_COUNT ? blocks - 1 : MAX_BLOCK_COUNT - 1;
    header.deviveId[0] = NRF_FICR->DEVICEID[0];
    header.deviveId[1] = NRF_FICR->DEVICEID[1];
    header.addrLow = NRF_FICR->DEVICEADDR[0];
    header.addrHi = NRF_FICR->DEVICEADDR[1];
    header.hwid = NRF_FICR->CONFIGID & 0xFFFF;

    copyMem(ptr, &header, sizeof(header));
    ptr += sizeof(header);

    copyMem(ptr, conf.name, sizeof(conf.name));
    while (*ptr != 0 && ptr < (uint8_t*)conf.name + sizeof(conf.name))
    {
        ptr++;
    }

    sendResponse(ptr - buffer);
}

static void sendStatus()
{
    uint8_t* buffer = getPacket();
    uint32_t bytes = (blocksReceived + 7) / 8;
    copyMem(&buffer[2], blockBitmap, bytes);
    sendResponse(2 + bytes);
}

static void sendHash()
{
    uint8_t* buffer = getPacket();
    aes_hash(&__begin_ramapp, blocksReceived * BLOCK_SIZE, &buffer[2]);
    sendResponse(2 + 16);
    zeroMem(blockBitmap, sizeof(blockBitmap));
    blocksReceived = 0;
}

static void writeBlock()
{
    uint8_t* buffer = getPacket();
    uint32_t blockNumber = buffer[4];
    uint8_t* ptr = &__begin_ramapp + blockNumber * BLOCK_SIZE;

    if (ptr + BLOCK_SIZE > &__end_ramapp)
    {
        return;
    }

    copyMem(ptr, &buffer[5], BLOCK_SIZE);
    if (blockNumber >= blocksReceived)
    {
        blocksReceived = blockNumber + 1;
    }
    blockBitmap[blockNumber / 8] |= 1 << (blockNumber & 0x7);
}

bool executeRequest()
{
    uint8_t* buffer = getPacket();
    uint32_t size = getPacketSize();
    RequestType type;

    if (size == 5 + BLOCK_SIZE)
    {
        type = WRITE_BLOCK;
    }
    else
    {
        type = buffer[4];
    }

    switch (type)
    {
    case GET_DEVICE_INFO:
        sendDeviceInfo();
        break;
    case GET_STATUS:
        sendStatus();
        break;
    case GET_HASH:
        sendHash();
        break;
    case START_APP:
        return false;
        break;
    case WRITE_BLOCK:
        writeBlock();
        break;
    default:
        break;
    }

    return true;
}
