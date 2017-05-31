# dollarClass

**dollarClass** is a JavaScript libary that allows creating classes that looks more like e.g. C#, Java, C++.

Class is created using following template:
```javascript
var ClassName = $class(Parent, /*... or more parents ...*/ function(st, pr, pv)
{
    // static class members
    return function(th, pr, pv)
    {
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

Members are defined in following way:
```javascript
//TODO
```