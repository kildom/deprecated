


SRC_OPUS := \
	../opus/src/opus_encoder.c \
	../opus/src/repacketizer.c \
	../opus/src/extensions.c \
	../opus/src/opus.c \
	../opus/src/opus_decoder.c \

SRC_CELT := \
	../opus/celt/celt_encoder.c \
	../opus/celt/modes.c \
	../opus/celt/celt.c \
	../opus/celt/quant_bands.c \
	../opus/celt/laplace.c \
	../opus/celt/entcode.c \
	../opus/celt/rate.c \
	../opus/celt/bands.c \
	../opus/celt/vq.c \
	../opus/celt/cwrs.c \
	../opus/celt/mdct.c \
	../opus/celt/kiss_fft.c \
	../opus/celt/celt_decoder.c \

SRC_COMMON := \
	../opus/silk/lin2log.c \
	../opus/silk/log2lin.c \
	../opus/celt/pitch.c \
	../opus/celt/entenc.c \
	../opus/celt/entdec.c \
	../opus/celt/celt_lpc.c \
	../opus/celt/mathops.c \

SRC_SILK := \
	../opus/silk/biquad_alt.c \
	../opus/silk/dec_API.c \
	../opus/silk/enc_API.c \
	../opus/silk/LP_variable_cutoff.c \
	../opus/silk/check_control_input.c \
	../opus/silk/control_codec.c \
	../opus/silk/decode_frame.c \
	../opus/silk/control_SNR.c \
	../opus/silk/decode_indices.c \
	../opus/silk/decode_pulses.c \
	../opus/silk/decoder_set_fs.c \
	../opus/silk/encode_indices.c \
	../opus/silk/encode_pulses.c \
	../opus/silk/HP_variable_cutoff.c \
	../opus/silk/init_decoder.c \
	../opus/silk/init_encoder.c \
	../opus/silk/resampler.c \
	../opus/silk/stereo_decode_pred.c \
	../opus/silk/stereo_LR_to_MS.c \
	../opus/silk/stereo_MS_to_LR.c \
	../opus/silk/fixed/encode_frame_FIX.c \
	../opus/silk/CNG.c \
	../opus/silk/code_signs.c \
	../opus/silk/control_audio_bandwidth.c \
	../opus/silk/decode_core.c \
	../opus/silk/decode_parameters.c \
	../opus/silk/gain_quant.c \
	../opus/silk/NLSF_unpack.c \
	../opus/silk/NSQ_del_dec.c \
	../opus/silk/PLC.c \
	../opus/silk/resampler_private_down_FIR.c \
	../opus/silk/resampler_private_IIR_FIR.c \
	../opus/silk/resampler_private_up2_HQ.c \
	../opus/silk/shell_coder.c \
	../opus/silk/stereo_encode_pred.c \
	../opus/silk/stereo_find_predictor.c \
	../opus/silk/stereo_quant_pred.c \
	../opus/silk/VAD.c \
	../opus/silk/fixed/find_pred_coefs_FIX.c \
	../opus/silk/fixed/find_pitch_lags_FIX.c \
	../opus/silk/fixed/noise_shape_analysis_FIX.c \
	../opus/silk/fixed/process_gains_FIX.c \
	../opus/silk/ana_filt_bank_1.c \
	../opus/silk/bwexpander_32.c \
	../opus/silk/bwexpander.c \
	../opus/silk/decode_pitch.c \
	../opus/silk/inner_prod_aligned.c \
	../opus/silk/LPC_analysis_filter.c \
	../opus/silk/LPC_fit.c \
	../opus/silk/LPC_inv_pred_gain.c \
	../opus/silk/NLSF_decode.c \
	../opus/silk/NLSF2A.c \
	../opus/silk/process_NLSFs.c \
	../opus/silk/quant_LTP_gains.c \
	../opus/silk/resampler_private_AR2.c \
	../opus/silk/sigm_Q15.c \
	../opus/silk/sum_sqr_shift.c \
	../opus/silk/fixed/apply_sine_window_FIX.c \
	../opus/silk/fixed/autocorr_FIX.c \
	../opus/silk/fixed/find_LPC_FIX.c \
	../opus/silk/fixed/find_LTP_FIX.c \
	../opus/silk/fixed/k2a_FIX.c \
	../opus/silk/fixed/k2a_Q16_FIX.c \
	../opus/silk/fixed/LTP_analysis_filter_FIX.c \
	../opus/silk/fixed/pitch_analysis_core_FIX.c \
	../opus/silk/fixed/LTP_scale_ctrl_FIX.c \
	../opus/silk/fixed/residual_energy_FIX.c \
	../opus/silk/fixed/schur_FIX.c \
	../opus/silk/fixed/schur64_FIX.c \
	../opus/silk/fixed/vector_ops_FIX.c \
	../opus/silk/fixed/warped_autocorrelation_FIX.c \
	../opus/silk/VQ_WMat_EC.c \
	../opus/silk/fixed/burg_modified_FIX.c \
	../opus/silk/fixed/corrMatrix_FIX.c \
	../opus/silk/A2NLSF.c \
	../opus/silk/interpolate.c \
	../opus/silk/NLSF_encode.c \
	../opus/silk/NLSF_stabilize.c \
	../opus/silk/NLSF_VQ_weights_laroia.c \
	../opus/silk/resampler_down2_3.c \
	../opus/silk/resampler_down2.c \
	../opus/silk/sort.c \
	../opus/silk/tables_other.c \
	../opus/silk/NLSF_del_dec_quant.c \
	../opus/silk/NLSF_VQ.c \
	../opus/silk/pitch_est_tables.c \
	../opus/silk/resampler_rom.c \
	../opus/silk/table_LSF_cos.c \
	../opus/silk/tables_pulses_per_block.c \
	../opus/silk/tables_pitch_lag.c \
	../opus/silk/tables_LTP.c \
	../opus/silk/tables_gain.c \
	../opus/silk/NSQ.c \
	../opus/silk/tables_NLSF_CB_NB_MB.c \
	../opus/silk/tables_NLSF_CB_WB.c \

SRC_LIB := \
	../libopusmini/stubs.c \
	../libopusmini/opusmini.c \


ifeq (celt,$(VARIANT))
	TARGET := libopusminicelt
	CPPFLAGS := -DVARIANT_CELT=1
	ENTRY := build
	SRC := $(SRC_OPUS) $(SRC_CELT) $(SRC_COMMON) $(SRC_LIB)
else ifeq (silk,$(VARIANT))
	TARGET := libopusminisilk
	CPPFLAGS := -DVARIANT_SILK=1
	ENTRY := build
	SRC := $(SRC_OPUS) $(SRC_SILK) $(SRC_COMMON) $(SRC_LIB)
else ifeq (both,$(VARIANT))
	TARGET := libopusmini
	CPPFLAGS := -DVARIANT_BOTH=1
	ENTRY := build
	SRC := $(SRC_OPUS) $(SRC_CELT) $(SRC_SILK) $(SRC_COMMON) $(SRC_LIB)
else
	TARGET := libopusmini-invalid
	CPPFLAGS :=
	ENTRY := _all_variants
	SRC :=
endif

CFLAGS :=
CPPFLAGS += -Os -g3 -fdata-sections -ffunction-sections -Wl,--gc-sections \
	-Wall -fno-strict-aliasing -fshort-enums \
	-D__HEAP_SIZE=4096 -D__STACK_SIZE=8192 \
	-mthumb -mabi=aapcs \
	-mcpu=cortex-m4 -march=armv7e-m \
	-mfloat-abi=hard -mfpu=fpv4-sp-d16 \
	-I../opus/include \
	-I../opus/celt \
	-I../opus/silk \
	-I../opus/silk/fixed \
	-I../opus/src \
	-I../opus \

LDFLAGS := -Xlinker --print-memory-usage

DEMO_FLAGS :=
OPUS_FLAGS := --include config.h

OUTDIR = ../dist
OBJDIR = $(OUTDIR)/obj/$(TARGET)
LIB_FILE = $(OUTDIR)/$(TARGET).a
DEMO_FILE = $(OUTDIR)/obj/$(TARGET).elf
MAP_FILE = $(OUTDIR)/obj/$(TARGET).map
OBJ := $(patsubst ../%.c,$(OBJDIR)/%.c.o,$(SRC))
COMMON_DEPS := Makefile config.h
GCC_PREFIX := /home/doki/my/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi/bin/arm-none-eabi-

#CC := /home/doki/my/arm-gcc/bin/arm-none-eabi-gcc
CC := $(GCC_PREFIX)gcc
AR := $(GCC_PREFIX)ar

all: $(ENTRY)

build: $(LIB_FILE) $(DEMO_FILE)

_all_variants:
	+$(MAKE) VARIANT=celt
	+$(MAKE) VARIANT=silk
	+$(MAKE) VARIANT=both

$(LIB_FILE): $(OBJ) $(COMMON_DEPS)
	mkdir -p $(dir $@)
	$(AR) rcs $@ $^

$(DEMO_FILE): $(LIB_FILE) demo.c $(COMMON_DEPS)
	mkdir -p $(dir $@)
	$(CC) $(CFLAGS) $(CPPFLAGS) $(LDFLAGS) $(DEMO_FLAGS) -Xlinker -Map=$(MAP_FILE) demo.c $(LIB_FILE) -o $@

$(OBJDIR)/%.c.o : ../%.c $(COMMON_DEPS)
	mkdir -p $(dir $@)
	$(CC) -MD -c $(CFLAGS) $(CPPFLAGS) $(OPUS_FLAGS) $(word 1,$<) -o $@

