
#ifdef VARIANT_CELT

#include <API.h>

opus_int silk_Get_Encoder_Size(                         /* O    Returns error code                              */
    opus_int                        *encSizeBytes       /* O    Number of bytes in SILK encoder state           */
)
{
    *encSizeBytes = 0;
    return SILK_NO_ERROR;
}

opus_int silk_InitEncoder(                              /* O    Returns error code                              */
    void                            *encState,          /* I/O  State                                           */
    int                              arch,              /* I    Run-time architecture                           */
    silk_EncControlStruct           *encStatus          /* O    Encoder Status                                  */
)
{
    return SILK_NO_ERROR;
}

opus_int silk_Encode(                                   /* O    Returns error code                              */
    void                            *encState,          /* I/O  State                                           */
    silk_EncControlStruct           *encControl,        /* I    Control status                                  */
    const opus_int16                *samplesIn,         /* I    Speech sample input vector                      */
    opus_int                        nSamplesIn,         /* I    Number of samples in input vector               */
    ec_enc                          *psRangeEnc,        /* I/O  Compressor data structure                       */
    opus_int32                      *nBytesOut,         /* I/O  Number of bytes in payload (input: Max bytes)   */
    const opus_int                  prefillFlag,        /* I    Flag to indicate prefilling buffers no coding   */
    opus_int                        activity            /* I    Decision of Opus voice activity detector        */
)
{
    return SILK_ENC_INTERNAL_ERROR;
}

/* Second order ARMA filter, alternative implementation */
void silk_biquad_alt_stride1(
    const opus_int16            *in,                /* I     input signal                                               */
    const opus_int32            *B_Q28,             /* I     MA coefficients [3]                                        */
    const opus_int32            *A_Q28,             /* I     AR coefficients [2]                                        */
    opus_int32                  *S,                 /* I/O   State vector [2]                                           */
    opus_int16                  *out,               /* O     output signal                                              */
    const opus_int32            len                 /* I     signal length (must be even)                               */
)
{
    // TODO: Assert
    while(1){}
}

void silk_biquad_alt_stride2_c(
    const opus_int16            *in,                /* I     input signal                                               */
    const opus_int32            *B_Q28,             /* I     MA coefficients [3]                                        */
    const opus_int32            *A_Q28,             /* I     AR coefficients [2]                                        */
    opus_int32                  *S,                 /* I/O   State vector [4]                                           */
    opus_int16                  *out,               /* O     output signal                                              */
    const opus_int32            len                 /* I     signal length (must be even)                               */
)
{
    // TODO: Assert
    while(1){}
}

opus_int silk_Get_Decoder_Size(                         /* O    Returns error code                              */
    opus_int                        *decSizeBytes       /* O    Number of bytes in SILK decoder state           */
)
{
    *decSizeBytes = 0;
    return SILK_NO_ERROR;
}

opus_int silk_InitDecoder(                              /* O    Returns error code                              */
    void                            *decState           /* I/O  State                                           */
)
{
    return SILK_NO_ERROR;
}

/* Reset decoder state */
opus_int silk_ResetDecoder(                              /* O    Returns error code                              */
    void                            *decState           /* I/O  State                                           */
)
{
    return SILK_NO_ERROR;
}

/* Decode a frame */
opus_int silk_Decode(                                   /* O    Returns error code                              */
    void*                           decState,           /* I/O  State                                           */
    silk_DecControlStruct*          decControl,         /* I/O  Control Structure                               */
    opus_int                        lostFlag,           /* I    0: no loss, 1 loss, 2 decode fec                */
    opus_int                        newPacketFlag,      /* I    Indicates first decoder call for this packet    */
    ec_dec                          *psRangeDec,        /* I/O  Compressor data structure                       */
    opus_int16                      *samplesOut,        /* O    Decoded output speech vector                    */
    opus_int32                      *nSamplesOut,       /* O    Number of samples decoded                       */
#ifdef ENABLE_DEEP_PLC
    LPCNetPLCState                  *lpcnet,
#endif
    int                             arch                /* I    Run-time architecture                           */
)
{
    return SILK_ENC_INTERNAL_ERROR;
}

#endif

#ifdef VARIANT_SILK

#include "celt.h"

int opus_custom_decoder_ctl(CELTDecoder * OPUS_RESTRICT st, int request, ...)
{
    return OPUS_OK;
}

int opus_custom_encoder_ctl(CELTEncoder * OPUS_RESTRICT st, int request, ...)
{
    return OPUS_OK;
}

int celt_encoder_get_size(int channels)
{
    return 0;
}

int celt_decoder_get_size(int channels)
{
    return 0;
}


int celt_decoder_init(CELTDecoder *st, opus_int32 sampling_rate, int channels)
{
    return OPUS_OK;
}

int celt_encoder_init(CELTEncoder *st, opus_int32 sampling_rate, int channels,
    int arch)
{
    return OPUS_OK;
}

int celt_decode_with_ec_dred(CELTDecoder * OPUS_RESTRICT st, const unsigned char *data,
    int len, opus_val16 * OPUS_RESTRICT pcm, int frame_size, ec_dec *dec, int accum
#ifdef ENABLE_DEEP_PLC
    ,LPCNetPLCState *lpcnet
#endif
    )
{
    return OPUS_UNIMPLEMENTED;
}


int celt_decode_with_ec(CELTDecoder * OPUS_RESTRICT st, const unsigned char *data,
    int len, opus_val16 * OPUS_RESTRICT pcm, int frame_size, ec_dec *dec, int accum)
{
    return OPUS_UNIMPLEMENTED;
}


int celt_encode_with_ec(CELTEncoder * OPUS_RESTRICT st, const opus_val16 * pcm, int frame_size, unsigned char *compressed, int nbCompressedBytes, ec_enc *enc)
{
    return OPUS_UNIMPLEMENTED;
}

#endif
