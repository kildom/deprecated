# Minimum viable product

* Classic GC, no refcounting, not incremental, not generational (but keep in mind that it can be added later)
* No performance improvements,
* Basic heap usage optimization,
* Undefined properties ordering (but keep in mind that it can be improved later),
* Low number of configuration options,
* Basic set of standard classes, e.g. no weak references, no Proxy, no Atomics, no Deprecated API, limited RegExp, no intl,
* No array-like objects for Array API,
* No UTF-8 strings, just ISO/IEC 8859-1, char codes are in range (0, 255),
