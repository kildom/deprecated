
#include <wasi/api.h>
#include "wasm.h"


WASM_EXPORT(path_remove_directory)
__wasi_errno_t __wasi_path_remove_directory__with_len(
    __wasi_fd_t fd,
    const char *path,
    size_t path_len
) {
    return __WASI_ERRNO_SUCCESS;
}

WASM_EXPORT(path_unlink_file)
__wasi_errno_t __wasi_path_unlink_file__with_len(
    __wasi_fd_t fd,
    const char *path,
    size_t path_len
) {
    return __WASI_ERRNO_SUCCESS;
}


WASM_EXPORT(args_get)
__wasi_errno_t __wasi_args_get(
    uint8_t * * argv,
    uint8_t * argv_buf
) {
    *argv = argv_buf;
    argv_buf[0] = 48;
    argv_buf[1] = 0;
    return __WASI_ERRNO_SUCCESS;
}

WASM_EXPORT(args_sizes_get)
__wasi_errno_t __wasi_args_sizes_get(
    __wasi_size_t *retptr0,
    __wasi_size_t *retptr1
) {
    *retptr0 = 1;
    *retptr1 = 2;
    return __WASI_ERRNO_SUCCESS;
}


WASM_EXPORT(environ_get)
__wasi_errno_t __wasi_environ_get(
    uint8_t * * environ,
    uint8_t * environ_buf
) {
    return __WASI_ERRNO_SUCCESS;
}


WASM_EXPORT(environ_sizes_get)
__wasi_errno_t __wasi_environ_sizes_get(
    __wasi_size_t *retptr0,
    __wasi_size_t *retptr1
) {
    *retptr0 = 0;
    *retptr1 = 0;
    return __WASI_ERRNO_SUCCESS;
}

WASM_EXPORT(clock_res_get)
__wasi_errno_t __wasi_clock_res_get(
    __wasi_clockid_t id,
    __wasi_timestamp_t *retptr0
) {
    *retptr0 = 1000000;
    return __WASI_ERRNO_SUCCESS;
}

WASM_IMPORT(getTime) uint64_t getTime(uint32_t realTime);
WASM_IMPORT(getRandom) void getRandom(uint8_t *buf, uint32_t size);

#ifdef DEBUG
void logMessage(const void* str, uint32_t len)
{
    WASM_IMPORT(log) void hostLog(int level, const void* str, uint32_t len);
    hostLog(4, str, len);
}
#else
WASM_IMPORT_FROM_MODULE(mod, stdoutWrite) void logMessage(const void* str, uint32_t len);
#endif

WASM_EXPORT(clock_time_get)
__wasi_errno_t __wasi_clock_time_get(
    __wasi_clockid_t id,
    __wasi_timestamp_t precision,
    __wasi_timestamp_t *retptr0
) {
    *retptr0 = 1000000ll * getTime(id == __WASI_CLOCKID_REALTIME);
    return __WASI_ERRNO_SUCCESS;
}

WASM_EXPORT(random_get)
__wasi_errno_t __wasi_random_get(
    uint8_t * buf,
    __wasi_size_t buf_len
) {
    getRandom(buf, buf_len);
    return __WASI_ERRNO_SUCCESS;
}

WASM_EXPORT(fd_read)
__wasi_errno_t __wasi_fd_read(
    __wasi_fd_t fd,
    const __wasi_iovec_t *iovs,
    size_t iovs_len,
    __wasi_size_t *retptr0
) {
    return __WASI_ERRNO_BADF;
}

WASM_EXPORT(fd_write)
__wasi_errno_t __wasi_fd_write(
    __wasi_fd_t fd,
    const __wasi_ciovec_t *iovs,
    size_t iovs_len,
    __wasi_size_t *retptr0
) {
    if (fd != 1 && fd != 2) {
        return __WASI_ERRNO_BADF;
    }
    *retptr0 = 0;
    for (size_t i = 0; i < iovs_len; i++) {
        const __wasi_ciovec_t *iovec = &iovs[i];
        logMessage((const char*)iovec->buf, iovec->buf_len); // TODO: Add level parameter
        *retptr0 += iovec->buf_len;
    }
    return __WASI_ERRNO_SUCCESS;
}

WASM_EXPORT(fd_seek)
__wasi_errno_t __wasi_fd_seek(
    __wasi_fd_t fd,
    __wasi_filedelta_t offset,
    __wasi_whence_t whence,
    __wasi_filesize_t *retptr0
) {
    return __WASI_ERRNO_BADF;
}

WASM_EXPORT(fd_close)
__wasi_errno_t __wasi_fd_close(
    __wasi_fd_t fd
) {
    return __WASI_ERRNO_SUCCESS;
}

WASM_EXPORT(fd_fdstat_get)
__wasi_errno_t __wasi_fd_fdstat_get(
    __wasi_fd_t fd,
    __wasi_fdstat_t *retptr0
) {
    return __WASI_ERRNO_BADF;
}

WASM_EXPORT(proc_exit)
_Noreturn void __wasi_proc_exit(
    __wasi_exitcode_t rval
) {
    __asm__ volatile ("unreachable");
    __builtin_unreachable();
}

WASM_EXPORT(fd_fdstat_set_flags)
__wasi_errno_t __wasi_fd_fdstat_set_flags(
    __wasi_fd_t fd,
    __wasi_fdflags_t flags
)  {
    return __WASI_ERRNO_BADF;
}

WASM_EXPORT(fd_prestat_get)
__wasi_errno_t __wasi_fd_prestat_get(
    __wasi_fd_t fd,
    __wasi_prestat_t *retptr0
) {
    return __WASI_ERRNO_BADF;
}

WASM_EXPORT(fd_prestat_dir_name)
__wasi_errno_t __wasi_fd_prestat_dir_name(
    __wasi_fd_t fd,
    /**
     * A buffer into which to write the preopened directory name.
     */
    uint8_t * path,
    __wasi_size_t path_len
) {
    return __WASI_ERRNO_BADF;
}

WASM_EXPORT(path_open)
__wasi_errno_t __wasi_path_open__with_len(
    __wasi_fd_t fd,
    __wasi_lookupflags_t dirflags,
    const char *path,
    size_t path_len,
    __wasi_oflags_t oflags,
    __wasi_rights_t fs_rights_base,
    __wasi_rights_t fs_rights_inheriting,
    __wasi_fdflags_t fdflags,
    __wasi_fd_t *retptr0
) {
    return __WASI_ERRNO_BADF;
}
