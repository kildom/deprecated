
#include <pthread.h>
#include <sys/types.h>

extern "C"
pthread_t pthread_self(void)
{
    return (pthread_t)0;
}

extern "C"
pid_t getpid() { // For some reasons, WASI SDK is missing this function.
    return 1;
}
