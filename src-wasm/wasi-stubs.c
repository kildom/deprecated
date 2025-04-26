
#include <wasi/api.h>
#include <string.h>
#include "wasm.h"


WASM_IMPORT(getTime) uint64_t getTime(uint32_t realTime);
WASM_IMPORT(getRandom) void getRandom(uint8_t *buf, uint32_t size);
WASM_IMPORT(log) void logMessage(const void* str, uint32_t len);
WASM_IMPORT(exit) _Noreturn void wasmExit(uint32_t code);

static void msg(const char* str) {
    const char* p = str;
    while (*p) p++;
    logMessage(str, p - str);
}

#define NS(name, ...) WASM_EXPORT(name) int32_t exported_##name(__VA_ARGS__) { msg("NS: " #name "\n"); return __WASI_ERRNO_NOSYS; }
#define BF(name, ...) WASM_EXPORT(name) int32_t exported_##name(__VA_ARGS__) { msg("BF: " #name "\n"); return __WASI_ERRNO_BADF; }
#define IV(name, ...) WASM_EXPORT(name) int32_t exported_##name(__VA_ARGS__) { msg("IV: " #name "\n"); return __WASI_ERRNO_INVAL; }
#define OK(name, ...) WASM_EXPORT(name) int32_t exported_##name(__VA_ARGS__) { msg("OK: " #name "\n"); return __WASI_ERRNO_SUCCESS; }
#define FF(name, ...) WASM_EXPORT(name) int32_t exported_##name(__VA_ARGS__);

FF(args_get, int32_t arg0, int32_t arg1)
FF(args_sizes_get, int32_t arg0, int32_t arg1)
IV(environ_get, int32_t arg0, int32_t arg1)
FF(environ_sizes_get, int32_t arg0, int32_t arg1)
FF(clock_res_get, int32_t arg0, int32_t arg1)
FF(clock_time_get, int32_t arg0, int64_t arg1, int32_t arg2)
BF(fd_advise, int32_t arg0, int64_t arg1, int64_t arg2, int32_t arg3)
BF(fd_allocate, int32_t arg0, int64_t arg1, int64_t arg2)
OK(fd_close, int32_t arg0)
OK(fd_datasync, int32_t arg0)
BF(fd_fdstat_get, int32_t arg0, int32_t arg1)
BF(fd_fdstat_set_flags, int32_t arg0, int32_t arg1)
BF(fd_fdstat_set_rights, int32_t arg0, int64_t arg1, int64_t arg2)
BF(fd_filestat_get, int32_t arg0, int32_t arg1)
BF(fd_filestat_set_size, int32_t arg0, int64_t arg1)
BF(fd_filestat_set_times, int32_t arg0, int64_t arg1, int64_t arg2, int32_t arg3)
BF(fd_pread, int32_t arg0, int32_t arg1, int32_t arg2, int64_t arg3, int32_t arg4)
BF(fd_prestat_get, int32_t arg0, int32_t arg1)
BF(fd_prestat_dir_name, int32_t arg0, int32_t arg1, int32_t arg2)
BF(fd_pwrite, int32_t arg0, int32_t arg1, int32_t arg2, int64_t arg3, int32_t arg4)
FF(fd_read, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3)
BF(fd_readdir, int32_t arg0, int32_t arg1, int32_t arg2, int64_t arg3, int32_t arg4)
BF(fd_renumber, int32_t arg0, int32_t arg1)
BF(fd_seek, int32_t arg0, int64_t arg1, int32_t arg2, int32_t arg3)
OK(fd_sync, int32_t arg0)
BF(fd_tell, int32_t arg0, int32_t arg1)
FF(fd_write, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3)
NS(path_create_directory, int32_t arg0, int32_t arg1, int32_t arg2)
NS(path_filestat_get, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3, int32_t arg4)
NS(path_filestat_set_times, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3, int64_t arg4, int64_t arg5, int32_t arg6)
NS(path_link, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3, int32_t arg4, int32_t arg5, int32_t arg6)
NS(path_open, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3, int32_t arg4, int64_t arg5, int64_t arg6, int32_t arg7, int32_t arg8)
NS(path_readlink, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3, int32_t arg4, int32_t arg5)
NS(path_remove_directory, int32_t arg0, int32_t arg1, int32_t arg2)
NS(path_rename, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3, int32_t arg4, int32_t arg5)
NS(path_symlink, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3, int32_t arg4)
NS(path_unlink_file, int32_t arg0, int32_t arg1, int32_t arg2)
NS(poll_oneoff, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3)
OK(sched_yield)
FF(random_get, int32_t arg0, int32_t arg1)
BF(sock_accept, int32_t arg0, int32_t arg1, int32_t arg2)
BF(sock_recv, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3, int32_t arg4, int32_t arg5)
BF(sock_send, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3, int32_t arg4)
BF(sock_shutdown, int32_t arg0, int32_t arg1)
WASM_EXPORT(proc_exit) _Noreturn void exported_proc_exit(int32_t arg0);

int32_t exported_args_get(int32_t arg0, int32_t arg1)
{
    msg("FF: exported_args_get\n");
    uint8_t * * argv = (uint8_t * *)arg0;
    uint8_t * argv_buf = (uint8_t *)arg1;
    *argv = argv_buf;
    argv_buf[0] = 48;
    argv_buf[1] = 0;
    return __WASI_ERRNO_SUCCESS;
}


int32_t exported_args_sizes_get(int32_t arg0, int32_t arg1)
{
    msg("FF: exported_args_sizes_get\n");
    __wasi_size_t *retptr0 = (__wasi_size_t *)arg0;
    __wasi_size_t *retptr1 = (__wasi_size_t *)arg1;
    *retptr0 = 1;
    *retptr1 = 2;
    return __WASI_ERRNO_SUCCESS;
}

int32_t exported_environ_sizes_get(int32_t arg0, int32_t arg1)
{
    msg("FF: exported_environ_sizes_get\n");
    __wasi_size_t *retptr0 = (__wasi_size_t *)arg0;
    __wasi_size_t *retptr1 = (__wasi_size_t *)arg1;
    *retptr0 = 0;
    *retptr1 = 0;
    return __WASI_ERRNO_SUCCESS;
}

int32_t exported_clock_res_get(int32_t arg0, int32_t arg1)
{
    msg("FF: exported_clock_res_get\n");
    __wasi_timestamp_t *retptr0 = (__wasi_timestamp_t *)arg1;
    *retptr0 = 1000000;
    return __WASI_ERRNO_SUCCESS;
}

int32_t exported_clock_time_get(int32_t arg0, int64_t arg1, int32_t arg2)
{
    msg("FF: exported_clock_time_get\n");
    __wasi_clockid_t id = (__wasi_clockid_t)arg0;
    __wasi_timestamp_t *retptr0 = (__wasi_timestamp_t *)arg2;
    *retptr0 = 1000000ll * getTime(id == __WASI_CLOCKID_REALTIME);
    return __WASI_ERRNO_SUCCESS;
}

int32_t exported_random_get(int32_t arg0, int32_t arg1)
{
    msg("FF: exported_random_get\n");
    uint8_t * buf = (uint8_t *)arg0;
    __wasi_size_t buf_len = (__wasi_size_t)arg1;
    getRandom(buf, buf_len);
    return __WASI_ERRNO_SUCCESS;
}

int32_t exported_fd_read(int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3)
{
    msg("FF: exported_fd_read\n");
    __wasi_size_t *retptr0 = (__wasi_size_t *)arg3;
    *retptr0 = 0;
    return __WASI_ERRNO_BADF;
}

int32_t exported_fd_write(int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3)
{
    msg("FF: exported_fd_write\n");
    __wasi_fd_t fd = (__wasi_fd_t )arg0;
    const __wasi_ciovec_t *iovs = (const __wasi_ciovec_t *)arg1;
    size_t iovs_len = (size_t )arg2;
    __wasi_size_t *retptr0 = (__wasi_size_t *)arg3;
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

_Noreturn void exported_proc_exit(int32_t arg0)
{
    msg("FF: exported_proc_exit\n");
    wasmExit(arg0);
}
