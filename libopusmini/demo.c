
#include <opus.h>


int main() {

    int error = 0;

    opus_int16 pcm[1024];
    unsigned char packet[1024];

    OpusEncoder* enc = opus_encoder_create(16000, 1, OPUS_APPLICATION_RESTRICTED_LOWDELAY, &error);
    opus_encoder_ctl(enc, OPUS_SET_BITRATE(32000));
    int size = opus_encode(enc, pcm, 80, packet, 80);
    opus_encoder_destroy(enc);

    OpusDecoder* dec = opus_decoder_create(16000, 1, &error);
    opus_decoder_ctl(dec, OPUS_SET_COMPLEXITY(0));
    int samples = opus_decode(dec, packet, 80, pcm, size, 0);
    opus_decoder_destroy(dec);

    return samples;
}


void _exit(int) {while(1);};
void _write() {};
void _close() {};
void _lseek() {};
void _read() {};
void _sbrk() {};
