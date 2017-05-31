/*
    -------------------------------------------------------------------------------

    Copyright (c) 2017, Dominik Kilian
    All rights reserved.

    Redistribution  and  use  in  source  and  binary  forms,   with   or   without
    modification,  are  permitted  provided  that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice,  this
       list of conditions and the following disclaimer.
    2. Redistributions  in  binary  form must reproduce the above copyright notice,
       this  list  of  conditions and the following disclaimer in the documentation
       and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
    ANY EXPRESS OR IMPLIED WARRANTIES,  INCLUDING,  BUT NOT LIMITED TO, THE IMPLIED
    WARRANTIES  OF  MERCHANTABILITY  AND  FITNESS  FOR  A  PARTICULAR  PURPOSE  ARE
    DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
    ANY DIRECT,  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (INCLUDING,  BUT  NOT LIMITED TO,  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
    LOSS OF USE,  DATA,  OR PROFITS;  OR BUSINESS INTERRUPTION)  HOWEVER CAUSED AND
    ON  ANY  THEORY OF LIABILITY,  WHETHER IN CONTRACT,  STRICT LIABILITY,  OR TORT
    (INCLUDING  NEGLIGENCE OR OTHERWISE)  ARISING IN ANY WAY OUT OF THE USE OF THIS
    SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

    -------------------------------------------------------------------------------
*/

/*

$class(Parents, ..., function(st, pr, pv)
{
    // static part of class
    // static part is never inherited
    
    // To access static public members of this class use st.th (short for static this), e.g.
    st.th.publicField = 0;
    st.th.publicMethod = function()
    {
        print(st.th.publicField);
    }
    // st.th works the same in dynamic part of class
    // st.th is visible outside class as class members, e.g.
    SomeOtherClass.otherPublicField = 100;
    // st.th is acctually class itself, so you can do 'var obj = new st.th(...)' to create object of this class
    
    // To access static protected members of this class use st.pr (short for static protected), e.g.
    st.pr.protectedField = 0;
    st.pr.protectedMethod = function()
    {
        print(st.th.protectedField);
    }
    // st.pr works the same in dynamic part of class
    // st.pr is visible in childs using fillowing construction pr(Parent), e.g.
    pr(Parent).protectedFieldFromParent = 100;
    
    // st.pv contains static private members, but in most cases it is better to use local members
    
    // To access dynamic fields of some object 'obj':
    obj.publicMethod();
    pr(obj).protectedMethod();
    pv(obj).privateMethod();

    st.pr.construct = function()
    {
        // optional static constructor, will be called just after class creation
    }
    
    return function(th, pr, pv)
    {
        // dynamic part of class (optional)
        
        // th contains public part of object
        // th is actually the object itself
        // Some public methods from parents may be overriden by this class. To access original
        // methods use following construction ParentClass.$(th)
        
        // pr contains protected part of object
        // to access protected part from other object use pr(obj)
        // Some protected methods from parents may be overriden by this class. To access original
        // methods use following construction ParentClass.$(pr) 
        
        // pv contains private part of object for this class
        // to access private part of other object use pv(obj)
        
        // pr and pv are Javascript Functions, so be cafeul when using member names the same as in
        // JS Function object.
        
        pr.construct = function(...)
        {
            // optional constructor
            // this constructor is responsible for calling constructors from parents, e.g.
            Parent.$(pr).construct(arguments);
            // constructor will be created as empty method if not defined here
        }
    }
});
 
 */

/*
            members of    members of     overriden      Static      Static
            this object   other obj      methods of     members of  members of
            (D)           (S) (D)        ancestor Base  this class  class Cls
                                         (D)            (S) (D)     (S) (D)
            
public      th.           obj.           Base.$(th).    st.th.      Cls.
                          obj.$(th).                                Cls.$(st.th).

protected   pr.           obj.$(pr).     Base.$(pr).    st.pr.      Cls.$(st.pr).

private     pv.           obj.$(pv). (1) Base.$(pv).    st.pv.      Cls.$(st.pv).

local       x             -              -              x           -

(S) available in static context
(D) available in dynamic context
(1) obj is this class or desendant


friend:
Cls.friend(function(st, pr, pv, ...)
{
});

multiple Friends:
Cls.friend(Base.friend(function(stBase, prBase, pvBase, stCls, prCls, pvCls, ...)
{
}));

FOREIGN OBJECT. Construct on existsting object (e.g. to create object of some class from JSON data)
	Cls.construct(thisObj, args...) 
	e.g.
		var obj = JSON.decode(...);
		Cls.construct(obj);
		obj->someMethod();

multiple inheritance:

NewClass = $class(D, F, ...

A -> B -> C -> D
A -> B -> E -> F

A -> B -> C -> D -(A, B deleted, because already inherited)-> E -> F -> NewClass

constructor calls (and other virtual like methods):

NewClass.$(pr).construct
    D.$(pr).construct
        C.$(pr).construct
            B.$(pr).construct
                A.$(pr).construct
    F.$(pr).construct
        E.$(pr).construct
            B.$(pr).construct       <-- B constructor called for the second time
                A.$(pr).construct   <-- A constructor called for the second time

 */


function $class()
{
    // This is the class created here
    var classObj = function()
    {
        // Creation of new object of this class
        var th = this;
        this.__$class = classObj;                            // class of this object
        this.__$protected = { __$dynamicProtected: true, construct: $class._emptyFunction }; // create protected part of this object
        this.__$private = {};                                // holds private part for each ancestor and this class
        this.__$super = {};                                  // holds original public methods for each ancestor
        this.__$protected.__$super = {};                     // holds original protected methods for each ancestor
        this.$ = function(obj)
        {
            if (obj.__$dynamicProtected)
                return th.__$protected;
            else if (obj.__$dynamicPrivate)
                return th.__$private[obj.__$dynamicPrivate];
            else
                return th;
        }
        
        // Initialize each ancestor on this object (from oldest)
        for (var i in classObj.__$ancestors)
        {
            // Create private part in this object for current ancestor
            this.__$private[classObj.__$ancestors[i].__$id] = { __$dynamicPrivate: classObj.__$ancestors[i].__$id };
            // Call dynamic creator of current ancestor
            classObj.__$ancestors[i].__$creator.call(this,
                this,
                this.__$protected,
                this.__$private[classObj.__$ancestors[i].__$id]);
            // Save public methods of current ancestor (to access them later if overriden)
            this.__$super[classObj.__$ancestors[i].__$id] = {};
            $class._copyFunctions(this, this.__$super[classObj.__$ancestors[i].__$id]);
            // Save protected methods of current ancestor (to access them later if overriden)
            this.__$protected.__$super[classObj.__$ancestors[i].__$id] = {};
            $class._copyFunctions(this.__$protected, this.__$protected.__$super[classObj.__$ancestors[i].__$id]);
        }
        // Create private part in this object for this class
        this.__$private[classObj.__$id] = { __$dynamicPrivate: classObj.__$id };
        // Call dynamic creator of this class
        classObj.__$creator.call(this,
            this,
            this.__$protected,
            this.__$private[classObj.__$id]);
        // Call constructor passing all arguments
        this.__$protected.construct.apply(this, arguments);
    };

    // Initialize this class
    classObj.__$id = $class._allocateId();                                                   // unique id of this class
    classObj.__$private = { __$staticPrivate : true };                                       // static private part
    classObj.__$protected = { __$staticProtected : true, construct: $class._emptyFunction }; // static protected part (with empty constructor)
    classObj.__$ancestors = $class._mergeAncestors(arguments);    // array of all ancestor (from oldest)
    // map with id of each ancestor (map[id] = true)
    classObj.__$classIdMap = $class._createAncestorsMap(classObj.__$ancestors, classObj.__$id);
    
    // function for accessing original (not overriden by child) methods from this class
    classObj.$ = function(obj)
    {
        if (typeof(obj.__$super) != 'undefined') // Base.$(th), Base.$(pr)
            return obj.__$super[classObj.__$id];
        else if (obj.__$staticProtected) // Base.$(st.pr)
            return classObj.__$protected;
        else if (obj.__$staticPrivate) // Base.$(st.pv)
            return classObj.__$private;
        else // Base.$(st.th)
            return classObj;
    }
    
    // function checks if obj is this class or any of its children 
    classObj.isInstanceOfClass = function(obj)
    {
        return (typeof(obj) == 'object') && (typeof(obj.__$class) == 'function') && (typeof(obj.__$class.__$classIdMap[classObj.__$id]) != 'undefined');
    }
    
    classObj.friend = function(func)
    {
        return function()
        {
            var args = [ classObj.__$st, $class._prInStaticContext, classObj.__$pvInStaticContext ];
            for (var i = 0; i < arguments.length; i++)
            {
                args.push(arguments[i]);
            }
            func.apply(this, args);
        }
    }
	
	classObj.construct = function(thisObj)
	{
	    if (thisObj == null)
	        return null;
		var args = [];
		for (var i = 1; i < arguments.length; i++)
		{
			args.push(arguments[i]);
		}
		classObj.apply(thisObj, args);
	}
    
    classObj.__$st = { th : classObj, pr : classObj.__$protected, pv : classObj.__$private };
    classObj.__$pvInStaticContext = { __$dynamicPrivate : classObj.__$id };
    
    // Call class creator to create static part of class and get object creator
    classObj.__$creator = (arguments[arguments.length - 1])(
            classObj.__$st,
            $class._prInStaticContext,
            classObj.__$pvInStaticContext);
    
    // In case of pure static classes object creator does not exists
    if (typeof(classObj.__$creator) == 'undefined')
        classObj.__$creator = $class._emptyFunction;
    
    // Call static constructor of this class
    classObj.__$protected.construct();
    
    // Return prepared class
    return classObj;
}


$class._prInStaticContext = { __$dynamicProtected : true };


$class._lastId = '';


$class._allocateId = function()
{
    var id = $class._lastId;
    var index = 0;
    while (index < id.length)
    {
        var code = id.charCodeAt(index);
        if (code != 0x5A)
        {
            $class._lastId = id.substring(0, index) + String.fromCharCode(code + 1) + id.substring(index + 1);
            return $class._lastId;
        }
        else
        {
            id = id.substring(0, index) + 'A' + id.substring(index + 1);
            index++;
        }
    }
    $class._lastId = id + 'A';
    return $class._lastId;
}


$class._createAncestorsMap = function(ancestors, id)
{
    var map = [];
    for (var i in ancestors)
    {
        map[ancestors[i].__$id] = true;
    }
    map[id] = true;
    return map;
}


$class._mergeAncestors = function(args)
{
    if (args.length > 1)
    {
        var ancestors = args[0].__$ancestors.slice();
        ancestors.push(args[0]);
        for (var i = 1; i < args.length - 1; i++)
        {
            for (var k = 0; k < args[i].__$ancestors.length; k++)
                if (ancestors.indexOf(args[i].__$ancestors[k]) < 0)
                    ancestors.push(args[i].__$ancestors[k]);
            if (ancestors.indexOf(args[i]) < 0)
                ancestors.push(args[i]);                
        }
        return ancestors;
    }
    else
    {
        return [];
    }
}


$class._emptyFunction = function()
{
}


$class._copyFunctions = function(from, to)
{
    for (var i in from)
        if (typeof(from[i]) == 'function' && !('' + i).startsWith('__$'))
            to[i] = from[i];
}

