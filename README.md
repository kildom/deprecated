# dollarClass

**dollarClass** is a JavaScript library that allows creating classes that behaves more like e.g. C#, Java, C++.

Class is created using following template:
```javascript
var ClassName = $class(Parent, /*... or more parents ...*/ function(st, pr, pv) {
    // static class members
    return function(th, pr, pv) {
        // dynamic class members (optional)
    }
});
```
Object can be created as usual:
```javascript
var someObject = new ClassName(some, argument);
```

Normally in JavaScript you can use `this.` to access *public* members of your object. **dollarClass** allows you to define also *protected* members, *private* members and also one more called *local* members. Members can also be *static*. Because of that, when you use `$class` you have to use following prefixes:
 * `th.` - public members (instead of `this.`)
 * `pr.` - protected members
 * `pv.` - private members
 * local members have no prefix
 * `st.th.` - static public members
 * `st.pr.` - static protected members
 * `st.pv.` - static private members
 * static local members have no prefix

## Defining class

Members are defined in following way:
```javascript
var ClassName = $class(function(st, pr, pv) {

    // static local field
    var counter;
    
    // static local method
    function incCounter(n)  { counter =+ n; }
    
    // static private member
    // Static private members have no advantage over local members. They require prefix, so it is
    // easier to use static local members.
    st.pv.getCounterPow2 = function() { return counter * counter; }
    
    // static protected member
    st.pr.printSomething = function() { print("Coutner^2 is: " + st.pv.getCounterPow2()); }
    
    // static public member
    st.th.getCounter = function() { return counter; }
    
    // special method (static constructor) that will be called just after creation of this class
    st.pr.construct = function() { counter = 1; }
    
    return function(th, pr, pv) {
        
        // local member
        var id = 0x11223344;
        
        // private member
        pv.changeId = function(mask) { id ^= mask; }
        
        // protected member
        pr.nextId = function() { return (++id); }
        
        // public member
        th.getCurrentId = function() { return id; }
        
        // class constructor (always protected)
        pr.construct = function(initialMask) { pv.changeId(initialMask); }
        
    }
});
```

## Accessing members

Following table summarizes how to access members from different context.

|  Member `m` is: | | public | protected | private | local |
|---------------------|----|--------|-------|------|--------|
| member of this object | *D*  | `th.m` | `pr.m` | `pv.m` | `m` |
| member of other object  | *D* *S* | `obj.m` *(4)* | `obj.$(pr).m` *(1)* | `obj.$(pv).m` *(2)* | n/a |
| overriden method of acestor | *D* | `Class.$(th).m` *(3)* | `Class.$(pr).m` *(3)* | n/a | n/a |
| static member of this class | *D* *S* | `st.th.m` |  `st.pr.m` |  `st.pv.m` |  `m` |
| static member of other class | *D* *S*| `Class.m` *(5)* | `Class.$(st.pr).m` *(3)*  | n/a | n/a |

Where:
 * `m` -- member that we want to access
 * `obj` -- some other object
 * `Class` -- some other class
 * *D* -- can be done in dynamic context
 * *S* -- can be done in static context

Notes:
 * *(1)*-- `obj` have to be instance of this class or any of the ancestors
 * *(2)* -- `obj` have to be instance of this class
 * *(3)* -- `Class` have to be any of the ancestors of this class
 * *(4)* -- Notation `obj.$(th).m` is also possible, but not preferred
 * *(5)* -- Notation `Class.$(st.th).m` is also possible, but not preferred

You can check if some object is instance of specific class or any of the ancestors, e.g.:
```javascript
if (ClassName.isInstanceOfClass(obj))
    print('obj is instnce of ClassName');
```

## Friend functions or methods

You can create friend function like in C++ that can access private and protected members of class `ClassName`:
```javascript
var func = ClassName.friend(function(st, pr, pv, obj, argument) {
    // you can access members the same way as from static context of class ClassName
    // assume that obj is instance of ClassName
    obj.$(pv).changeId(argument);
});

// you can now call created function:
func(obj, 0x44332211);
```

Function can also be friend to multiple classes, e.g.:
```javascript
var func = A.friend(B.friend(function(stB, prB, pvB, stA, prA, pvA, ...) {
    obj.$(pvA).field = other.$(prB).calc();
}));

// you can now call created function:
func(...);
```

## Foreign Object

There are situations when we want to create enrich existing object by some class members, e.g. we have some data from JSON and we want to add some methods to it. We ca use static method `construct()`, e.g.:
```javascript
var obj = JSON.decode(...);
SomeClass.construct(obj);
// obj is now instance of SomeClass
obj->someMethod();
```

## Multiple Inheritance

Multiple Inheritance works little different than in other languages. Assume that we want to create `NewClass` that inherits `D` and `F`. Those classes have following inheritance:
```
A --> B --> C --> [D]
A --> B --> E --> [F]
```

**dollarClass** allows only linear inheritance. `A` and `B` are common ancestors, so they will be inherited only once by `NewClass`. Inheritance will be following:
```
A --> B --> C --> [D] --> E --> [F] --> NewClass
```

This have one very important side effect: When calling constructor (or other virtual like method) following call sequence will be:

```
NewClass.$(pr).construct
    D.$(pr).construct
        C.$(pr).construct
            B.$(pr).construct
                A.$(pr).construct
    F.$(pr).construct
        E.$(pr).construct
            B.$(pr).construct       <-- B constructor called for the second time
                A.$(pr).construct   <-- A constructor called for the second time
```


