
#include "common.h"

typedef enum {
    GET_DEVICE_INFO = 0x00,
    WRITE_BLOCK = 0x01,
    GET_STATUS = 0x02,
    GET_HASH = 0x03,
    START_APP = 0x04,
    START_MBR = 0x05,
} RequestType;

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

extern uint8_t __begin_ramapp[MAX_BLOCK_COUNT * BLOCK_SIZE];
extern uint8_t __end_ramapp[1];
static uint8_t blockBitmap[MAX_BLOCK_COUNT / 8];
static uint16_t blocksReceived = 0;


static void sendDeviceInfo()
{
    uint8_t* buffer = getSendBuffer();
    uint8_t* ptr = buffer;
    uint8_t* nameEnd;
    uint32_t blocks;
    DeviceInfoHeader header;

    ptr += 2;

    header.pagesAndAddrType = NRF_FICR->CODESIZE | ((NRF_FICR->DEVICEADDRTYPE & 1) << 15);
    header.blocksPerPage = NRF_FICR->CODEPAGESIZE / BLOCK_SIZE;
    blocks = (__end_ramapp - __begin_ramapp) / BLOCK_SIZE;
    header.blocksRamApp = blocks <= MAX_BLOCK_COUNT ? blocks - 1 : MAX_BLOCK_COUNT - 1;
    header.deviveId[0] = NRF_FICR->DEVICEID[0];
    header.deviveId[1] = NRF_FICR->DEVICEID[1];
    header.addrLow = NRF_FICR->DEVICEADDR[0];
    header.addrHi = NRF_FICR->DEVICEADDR[1];
    header.hwid = NRF_FICR->CONFIGID & 0xFFFF;

    copyMem(ptr, &header, sizeof(header));
    ptr += sizeof(header);

    copyMem(ptr, conf.name, sizeof(conf.name));
    nameEnd = ptr + sizeof(conf.name);
    while (*ptr != 0 && ptr < nameEnd)
    {
        ptr++;
    }

    sendResponse(ptr - buffer);
}

static void sendStatus()
{
    uint8_t* buffer = getSendBuffer();
    uint32_t bytes = (blocksReceived + 7) / 8;

    copyMem(&buffer[2], blockBitmap, bytes);
    sendResponse(2 + bytes);
}

static void sendHash()
{
    uint8_t* buffer = getSendBuffer();

    aes_hash(__begin_ramapp, blocksReceived * BLOCK_SIZE, &buffer[2]);
    sendResponse(2 + 16);
    zeroMem(blockBitmap, sizeof(blockBitmap));
    blocksReceived = 0;
}

static void writeBlock()
{
    uint8_t* buffer = getRecvBuffer();
    uint32_t blockNumber = buffer[4];
    uint8_t* ptr = __begin_ramapp + blockNumber * BLOCK_SIZE;

    if (ptr + BLOCK_SIZE > __end_ramapp)
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
    uint8_t* buffer = getRecvBuffer();
    RequestType type;
    
    type = buffer[4];

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
    case START_MBR:
        shutdown();
        break;
    case WRITE_BLOCK:
        writeBlock();
        break;
    default:
        break;
    }

    return true;
}
