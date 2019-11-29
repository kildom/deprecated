

#define dt 0.001

typedef struct SimuState_s
{
    uint64_t step;
    double time;
    double mainU;
    double mainY;
    double TESTOBJ__x;
} SimuState_t;

void simuInit(SimuState_t* state)
{
    // Init code
    state->step = 0;
    state->time = 0.0;
    state->TESTOBJ__x = 10.0;
}

void simu(int steps, SimuState_t* state, SimuCallback callback)
{
    // Locals code
    double time;
    double TESTOBJ__x;
    double TESTOBJ__x__next;
    double TESTOBJ__x__det;
    double TESTOBJ__U;
    double TESTOBJ__y;

    // Restore code
    time = state->time;
    TESTOBJ__x = state->TESTOBJ__x;

    while (steps--)
    {
        // Input/output code
        TESTOBJ__U = state->mainU;
        TESTOBJ__y = TESTOBJ__x + TESTOBJ__U;
        // If dierect interface
        //if (callback) callback(state); - somewhere in Input/output code
        state->mainY = TESTOBJ__y;
        TESTOBJ__K = 1.0;
        TESTOBJ__MIN = 0.0;
        TESTOBJ__MAX = 1.0;
        // Next state code
        TESTOBJ__x__det = TESTOBJ__K * (TESTOBJ__U - TESTOBJ__x);
        TESTOBJ__x__next = TESTOBJ__x__det * dt;
        TESTOBJ__x__next = Range(TESTOBJ__x__next, TESTOBJ__MIN, TESTOBJ__MAX);
        // If indierect interface
        if (callback) callback(state);
        // Apply code
        TESTOBJ__x = TESTOBJ__x__next;
        time += dt;
        state->time = time;
    }
    state->TESTOBJ__x = TESTOBJ__x;
}

/*

class TEST
    state x` = @U - @x
    output y = @U - @x

interface
    indirect
    input mainU
    output mainY = TEST.y

TEST
    U = interface.mainU

*/
