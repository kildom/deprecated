
TODO: Below GC parameters does not work properly.
We need hard heap limit. Possible solution:
1. In function (constructor) that blocks GC:
   * if counter == 1 (this is first entry to GC-disabled scope)
   * and if heapSize > currentThreshold then call triggerHardGC()
   (we don't need to check after exiting from GC-disabled scope,
   because we will check it just before allocating anything or
   entering GC-disabled scope again).
2. Before allocating anything:
   * if GC is not blocked
   * and if heapSize > currentThreshold then call triggerHardGC()
     triggerHardGC():
  * exit if GC is not possible, there may be more conditions
    than just GC-disabled scope.
  * do partial GC, e.g. minor GC (if this is possible)
    (skip partial GC once everything N times, this will ensure that full GC is
    executed sometimes).
  * if heapSize <= currentThreshold:
      * currentThreshold = min(currentThreshold, calcCurrentThreshold())
      * return
  * do full GC (with deallocating caches if heapSize above some bigger threshold)
  * if full GC was actually done (not rejected)
      * currentThreshold = calcCurrentThreshold()

calcCurrentThreshold():
  * inputs:
      * heapSize
      * aggressiveGCThreshold - heap size when aggressive GC kicks in
      * hardThreshold - heap size when GC works all the time
  return max(aggressiveGCThreshold, (0.5 + k / 2) * heapSize + (0.5 - k / 2) * hardThreshold)
  where k is parameter from 0 to 1 tells how aggressive approach is used
  when we are are close to the limit.
      0.0 - almost not aggressive
      0.5 - pretty optimal value
      0.8 - very aggressive

Useful symbols:
     NonIncrementalGC
     CellAllocator::PreAllocChecks
     JSContext::suppressGC
     JSContext::isInUnsafeRegion
     conditions for GC:
         !JS::RuntimeHeapIsBusy()
         !JSContext::suppressGC
         !JSContext::isInUnsafeRegion()
         !JSRuntime::isBeingDestroyed()
         !GCRuntime::isShutdownGC()
     checkIfGCAllowedInCurrentState

```
JS_SetGCParameter(cx, JSGC_MAX_BYTES, heapSizeLimit);
JS_SetGCParameter(cx, JSGC_ALLOCATION_THRESHOLD, 32);
JS::AutoDisableGenerationalGC noggc(cx);
```
