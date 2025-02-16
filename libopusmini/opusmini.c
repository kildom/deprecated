
#include <stdlib.h>
#include <stdint.h>
#include <opus.h>
#include <opus_private.h>

#define COMPLEXITY 1
#define PACKET_LOSS_PERC 0 // Increase if send over radio

#if defined(VARIANT_CELT)
#   define APPLICATION OPUS_APPLICATION_RESTRICTED_LOWDELAY
#else
#   define APPLICATION OPUS_APPLICATION_VOIP
#endif

/*
 * Constant parameters:
 *     16000 Hz sampling rate (wideband)
 *     1 channel
 *     10 ms frame size (100 fps, 160 samples/frame)
 *     40 bytes/frame (32000 bps)
 */
#define SAMPLE_RATE 16000
#define SAMPLE_BITS 16
#define CHANNELS 1
#define FRAME_MS 10
#define FRAME_RATE (1000 / FRAME_MS)
#define FRAME_SAMPLES (SAMPLE_RATE * FRAME_MS / 1000)
#define FRAME_BYTES 40
#define BITRATE (FRAME_BYTES * FRAME_RATE * 8)

void* create_encoder() {
    int error = 0;

    OpusEncoder* enc = opus_encoder_create(SAMPLE_RATE, CHANNELS, APPLICATION, &error);

    if (enc == NULL) {
        return enc;
    }
    
    error = error
        || opus_encoder_ctl(enc, OPUS_SET_BITRATE(BITRATE))
        || opus_encoder_ctl(enc, OPUS_SET_COMPLEXITY(COMPLEXITY))
        || opus_encoder_ctl(enc, OPUS_SET_PACKET_LOSS_PERC(PACKET_LOSS_PERC))
        || opus_encoder_ctl(enc, OPUS_SET_VBR(0))
        || opus_encoder_ctl(enc, OPUS_SET_VBR_CONSTRAINT(0))
        || opus_encoder_ctl(enc, OPUS_SET_INBAND_FEC(PACKET_LOSS_PERC > 0))
        || opus_encoder_ctl(enc, OPUS_SET_LSB_DEPTH(SAMPLE_BITS))
#if defined(VARIANT_CELT)
        || opus_encoder_ctl(enc, OPUS_SET_FORCE_MODE(MODE_CELT_ONLY))
#elif defined(VARIANT_SILK)
        || opus_encoder_ctl(enc, OPUS_SET_FORCE_MODE(MODE_SILK_ONLY))
#endif
        ;

    if (error) {
        opus_encoder_destroy(enc);
        return NULL;
    }

    return enc;
}
