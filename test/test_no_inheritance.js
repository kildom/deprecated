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



TEST_CASE('static members', function()
{
    var Class = $class(function(st, pr, pv)
    {
        var staticLocal = 'staticLocal';
        st.pv.staticPrivate = 'staticPrivate';
        st.pr.staticProtected = 'staticProtected';
        st.th.staticPublic = 'staticPublic';

        function loc() { return staticLocal; }
        st.th.pub = function() { return st.th.staticPublic; }
        st.pr.pro = function() { return st.pr.staticProtected; }
        st.pv.prv = function() { return st.pv.staticPrivate; }

        st.th.testInner = function()
        {
            EXPECT_EQ(staticLocal, 'staticLocal');
            EXPECT_EQ(st.pv.staticPrivate, 'staticPrivate');
            EXPECT_EQ(st.pr.staticProtected, 'staticProtected');
            EXPECT_EQ(st.th.staticPublic, 'staticPublic');

            EXPECT_EQ(loc(), 'staticLocal');
            EXPECT_EQ(st.pv.prv(), 'staticPrivate');
            EXPECT_EQ(st.pr.pro(), 'staticProtected');
            EXPECT_EQ(st.th.pub(), 'staticPublic');
        }

        st.th.changeValues = function()
        {
            staticLocal = 'lo';
            st.pv.staticPrivate = 'pv';
            st.pr.staticProtected = 'pr';
            st.th.staticPublic = 'th';
        }

        st.th.testInnerAfterChange = function()
        {
            EXPECT_EQ(staticLocal, 'lo');
            EXPECT_EQ(st.pv.staticPrivate, 'pv');
            EXPECT_EQ(st.pr.staticProtected, 'pr');
            EXPECT_EQ(st.th.staticPublic, 'th');

            EXPECT_EQ(loc(), 'lo');
            EXPECT_EQ(st.pv.prv(), 'pv');
            EXPECT_EQ(st.pr.pro(), 'pr');
            EXPECT_EQ(st.th.pub(), 'th');
        }
    });

    EXPECT_EQ(typeof(Class.staticLocal), 'undefined');
    EXPECT_EQ(typeof(Class.staticPrivate), 'undefined');
    EXPECT_EQ(typeof(Class.staticProtected), 'undefined');
    EXPECT_EQ(Class.staticPublic, 'staticPublic');

    EXPECT_EQ(typeof(Class.loc), 'undefined');
    EXPECT_EQ(typeof(Class.prv), 'undefined');
    EXPECT_EQ(typeof(Class.pro), 'undefined');
    EXPECT_EQ(Class.pub(), 'staticPublic');

    Class.testInner();

    Class.changeValues();

    EXPECT_EQ(typeof(Class.staticLocal), 'undefined');
    EXPECT_EQ(typeof(Class.staticPrivate), 'undefined');
    EXPECT_EQ(typeof(Class.staticProtected), 'undefined');
    EXPECT_EQ(Class.staticPublic, 'th');

    EXPECT_EQ(typeof(Class.loc), 'undefined');
    EXPECT_EQ(typeof(Class.prv), 'undefined');
    EXPECT_EQ(typeof(Class.pro), 'undefined');
    EXPECT_EQ(Class.pub(), 'th');

    Class.testInnerAfterChange();

});


TEST_CASE('dynamic members', function()
{
    var Class = $class(function(st, pr, pv)
    {
        return function(th, pr, pv)
        {
            var Local = 'Local';
            pv.Private = 'Private';
            pr.Protected = 'Protected';
            th.Public = 'Public';

            function loc() { return Local; }
            th.pub = function() { return th.Public; }
            pr.pro = function() { return pr.Protected; }
            pv.prv = function() { return pv.Private; }

            th.testInner = function()
            {
                EXPECT_EQ(Local, 'Local');
                EXPECT_EQ(pv.Private, 'Private');
                EXPECT_EQ(pr.Protected, 'Protected');
                EXPECT_EQ(th.Public, 'Public');

                EXPECT_EQ(loc(), 'Local');
                EXPECT_EQ(pv.prv(), 'Private');
                EXPECT_EQ(pr.pro(), 'Protected');
                EXPECT_EQ(th.pub(), 'Public');
            }

            th.changeValues = function()
            {
                Local = 'lo';
                pv.Private = 'pv';
                pr.Protected = 'pr';
                th.Public = 'th';
            }

            th.testInnerAfterChange = function()
            {
                EXPECT_EQ(Local, 'lo');
                EXPECT_EQ(pv.Private, 'pv');
                EXPECT_EQ(pr.Protected, 'pr');
                EXPECT_EQ(th.Public, 'th');

                EXPECT_EQ(loc(), 'lo');
                EXPECT_EQ(pv.prv(), 'pv');
                EXPECT_EQ(pr.pro(), 'pr');
                EXPECT_EQ(th.pub(), 'th');
            }
        };
    });

    var obj = new Class();

    EXPECT_EQ(typeof(obj.Local), 'undefined');
    EXPECT_EQ(typeof(obj.Private), 'undefined');
    EXPECT_EQ(typeof(obj.Protected), 'undefined');
    EXPECT_EQ(obj.Public, 'Public');

    EXPECT_EQ(typeof(obj.loc), 'undefined');
    EXPECT_EQ(typeof(obj.prv), 'undefined');
    EXPECT_EQ(typeof(obj.pro), 'undefined');
    EXPECT_EQ(obj.pub(), 'Public');

    obj.testInner();

    obj.changeValues();

    EXPECT_EQ(typeof(obj.Local), 'undefined');
    EXPECT_EQ(typeof(obj.Private), 'undefined');
    EXPECT_EQ(typeof(obj.Protected), 'undefined');
    EXPECT_EQ(obj.Public, 'th');

    EXPECT_EQ(typeof(obj.loc), 'undefined');
    EXPECT_EQ(typeof(obj.prv), 'undefined');
    EXPECT_EQ(typeof(obj.pro), 'undefined');
    EXPECT_EQ(obj.pub(), 'th');

    obj.testInnerAfterChange();
});


TEST_CASE('constructor', function()
{
    var Class = $class(function(st, pr, pv)
    {
        return function(th, pr, pv)
        {
            var a1;
            var a2;

            pr.construct = function(arg1, arg2)
            {
                a1 = arg1;
                a2 = arg2;
            }

            th.pub1 = function()
            {
                return a1;
            }

            th.pub2 = function()
            {
                return a2;
            }
        }
    });

    var obj = new Class('aaa', 'bbb');

    EXPECT_EQ(obj.pub1(), 'aaa');
    EXPECT_EQ(obj.pub2(), 'bbb');

});


TEST_CASE('static members from dynamic context', function()
{
    var Class = $class(function(st, pr, pv)
    {
        var staticLocal = 'staticLocal';
        st.pv.staticPrivate = 'staticPrivate';
        st.pr.staticProtected = 'staticProtected';
        st.th.staticPublic = 'staticPublic';

        return function(th, pr, pv)
        {
            function loc() { return staticLocal; }
            pv.prv = function() { return st.pv.staticPrivate; }
            pr.pro = function() { return st.pr.staticProtected; }
            th.pub = function() { return st.th.staticPublic; }

            th.changeValues = function()
            {
                staticLocal = 'lo';
                st.pv.staticPrivate = 'pv';
                st.pr.staticProtected = 'pr';
                st.th.staticPublic = 'th';
            }

            th.testInnerAfterChange = function()
            {
                EXPECT_EQ(staticLocal, 'lo');
                EXPECT_EQ(st.pv.staticPrivate, 'pv');
                EXPECT_EQ(st.pr.staticProtected, 'pr');
                EXPECT_EQ(st.th.staticPublic, 'th');

                EXPECT_EQ(loc(), 'lo');
                EXPECT_EQ(pv.prv(), 'pv');
                EXPECT_EQ(pr.pro(), 'pr');
                EXPECT_EQ(th.pub(), 'th');
            }
        };
    });

    var obj1 = new Class();
    var obj2 = new Class();

    obj1.changeValues();
    obj2.testInnerAfterChange();
});


TEST_CASE('dynamic members from static context', function()
{
    var Class = $class(function(st, pr, pv)
    {
        st.th.testInner = function(obj)
        {
            EXPECT_EQ(obj.$(pv).Private, 'Private');
            EXPECT_EQ(obj.$(pr).Protected, 'Protected');
            EXPECT_EQ(obj.Public, 'Public');

            EXPECT_EQ(obj.$(pv).prv(), 'Private');
            EXPECT_EQ(obj.$(pr).pro(), 'Protected');
            EXPECT_EQ(obj.pub(), 'Public');
        }

        st.th.testInnerAfterChange = function(obj)
        {
            EXPECT_EQ(obj.$(pv).Private, 'pv');
            EXPECT_EQ(obj.$(pr).Protected, 'pr');
            EXPECT_EQ(obj.Public, 'th');

            EXPECT_EQ(obj.$(pv).prv(), 'pv');
            EXPECT_EQ(obj.$(pr).pro(), 'pr');
            EXPECT_EQ(obj.pub(), 'th');
        }

        return function(th, pr, pv)
        {
            pv.Private = 'Private';
            pr.Protected = 'Protected';
            th.Public = 'Public';

            th.pub = function() { return th.Public; }
            pr.pro = function() { return pr.Protected; }
            pv.prv = function() { return pv.Private; }

            th.changeValues = function()
            {
                pv.Private = 'pv';
                pr.Protected = 'pr';
                th.Public = 'th';
            }
        };
    });


    var obj1 = new Class();
    var obj2 = new Class();

    Class.testInner(obj1);
    Class.testInner(obj2);

    obj2.changeValues();

    Class.testInner(obj1);
    Class.testInnerAfterChange(obj2);

});



TEST_CASE('dynamic members from other object', function()
{
    var Class = $class(function(st, pr, pv)
    {
        return function(th, pr, pv)
        {
            pv.Private = 'Private';
            pr.Protected = 'Protected';
            th.Public1 = 'Public1';
            th.Public2 = 'Public2';

            pv.prv = function() { return pv.Private; }
            pr.pro = function() { return pr.Protected; }
            th.pub1 = function() { return th.Public1; }
            th.pub2 = function() { return th.Public2; }

            th.testInner = function()
            {
                EXPECT_EQ(pv.Private, 'Private');
                EXPECT_EQ(pr.Protected, 'Protected');
                EXPECT_EQ(th.Public1, 'Public1');
                EXPECT_EQ(th.Public2, 'Public2');

                EXPECT_EQ(pv.prv(), 'Private');
                EXPECT_EQ(pr.pro(), 'Protected');
                EXPECT_EQ(th.pub1(), 'Public1');
                EXPECT_EQ(th.pub2(), 'Public2');
            }

            th.changeValues = function(obj)
            {
                obj.$(pv).Private = 'pv';
                obj.$(pr).Protected = 'pr';
                obj.$(th).Public1 = 'th1';
                obj.Public2 = 'th2';
            }

            th.testInnerAfterChange = function()
            {
                EXPECT_EQ(pv.Private, 'pv');
                EXPECT_EQ(pr.Protected, 'pr');
                EXPECT_EQ(th.Public1, 'th1');
                EXPECT_EQ(th.Public2, 'th2');

                EXPECT_EQ(pv.prv(), 'pv');
                EXPECT_EQ(pr.pro(), 'pr');
                EXPECT_EQ(th.pub1(), 'th1');
                EXPECT_EQ(th.pub2(), 'th2');
            }
        };
    });

    var obj1 = new Class();
    var obj2 = new Class();

    obj1.testInner();
    obj2.testInner();

    obj2.changeValues(obj1);

    obj1.testInnerAfterChange();
    obj2.testInner();

});


TEST_CASE('friend function', function()
{
    var Class = $class(function(st, pr, pv)
    {
        st.pv.staticPrivate = 'staticPrivate';
        st.pr.staticProtected = 'staticProtected';
        st.th.staticPublic = 'staticPublic';

        return function(th, pr, pv)
        {
            pv.Private = 'Private';
            pr.Protected = 'Protected';
            th.Public = 'Public';
        }
    });

    var func = Class.friend(function(st, pr, pv, arg1, arg2)
    {
        EXPECT_EQ(st.pv.staticPrivate, 'staticPrivate');
        EXPECT_EQ(st.pr.staticProtected, 'staticProtected');
        EXPECT_EQ(st.th.staticPublic, 'staticPublic');
        var obj = new Class();
        EXPECT_EQ(obj.$(pv).Private, 'Private');
        EXPECT_EQ(obj.$(pr).Protected, 'Protected');
        EXPECT_EQ(obj.Public, 'Public');
        EXPECT_EQ(arg1, 'a');
        EXPECT_EQ(arg2, 'b');
    });

    func('a', 'b');
});


TEST_CASE('friend method', function()
{
    var Class1 = $class(function(st, pr, pv)
    {
        st.pv.staticPrivate = 'staticPrivate';
        st.pr.staticProtected = 'staticProtected';
        st.th.staticPublic = 'staticPublic';

        return function(th, pr, pv)
        {
            pv.Private = 'Private';
            pr.Protected = 'Protected';
            th.Public = 'Public';
        }
    });

    var Class2 = $class(function(st, pr, pv)
    {
        return function(th, pr, pv)
        {
            th.func = Class1.friend(function(stClass1, prClass1, pvClass1, arg1, arg2)
            {
                EXPECT_EQ(stClass1.pv.staticPrivate, 'staticPrivate');
                EXPECT_EQ(stClass1.pr.staticProtected, 'staticProtected');
                EXPECT_EQ(stClass1.th.staticPublic, 'staticPublic');
                var obj = new Class1();
                EXPECT_EQ(obj.$(pvClass1).Private, 'Private');
                EXPECT_EQ(obj.$(prClass1).Protected, 'Protected');
                EXPECT_EQ(obj.Public, 'Public');
                EXPECT_EQ(arg1, 'a');
                EXPECT_EQ(arg2, 'b');
            });
        }
    });

    var obj2 = new Class2()
    obj2.func('a', 'b');
});


TEST_CASE('foreign object', function()
{
    var Class = $class(function(st, pr, pv)
    {
        return function(th, pr, pv)
        {
            var a1;
            var a2;

            pr.construct = function(arg1, arg2)
            {
                a1 = arg1;
                a2 = arg2;
            }

            th.pub = function()
            {
                return th.foreign;
            }

            th.pub1 = function()
            {
                return a1;
            }

            th.pub2 = function()
            {
                return a2;
            }
        }
    });

    var obj = { foreign : 'foreign value' };

    Class.construct(obj, 'aaa', 'bbb');

    EXPECT_EQ(obj.pub(), 'foreign value');
    EXPECT_EQ(obj.pub1(), 'aaa');
    EXPECT_EQ(obj.pub2(), 'bbb');

});


/* ==== ESLINT BEGIN ==== */
/* global TEST_CASE, $class, EXPECT_EQ  */
/* ==== ESLINT END ==== */
