from sly import Lexer, Parser
import sly

sly.yacc.YaccProduction

class CalcLexer(Lexer):
    _ = _
    tokens = {
        NAME, NUMBER, IF, ELSE, FUNCTION, DELEGATE, VAR, STRUCT,
        WHILE, DO, BREAK, CONTINUE, SWITCH, CASE, DEFAULT,
        ENUM, FOR, RETURN, IMPORT }
    ignore = ' \t\r\n'
    literals = { '=', '+', '-', '*', '/', '(', ')', ';', '.', ',', '[', ']', "&", '{', '}', ':' }

    # Tokens
    IMPORT = 'import'
    RETURN = 'return'
    FOR = 'for'
    ENUM = 'enum'
    DEFAULT = 'default'
    SWITCH = 'switch'
    CASE = 'case'
    BREAK = 'break'
    CONTINUE = 'continue'
    VAR = 'var'
    DELEGATE = 'delegate'
    FUNCTION = 'function'
    WHILE = 'while'
    DO = 'do'
    STRUCT =  r'struct|union'
    IF = 'if'
    ELSE = 'else'
    NAME = r'[a-zA-Z_][a-zA-Z0-9_]*'

    @_(r'\d+')
    def NUMBER(self, t):
        t.value = int(t.value)
        return t

    def error(self, t):
        print("Illegal character '%s'" % t.value[0])
        self.index += 1

class CalcParser(Parser):
    _ = _
    debugfile = 'parser.out'
    tokens = CalcLexer.tokens

    precedence = (
        ('right', 'ELSE', 'IFPREC'),
        ('left', '+', '-'),
        ('left', '*', '/'),
        ('right', 'UMINUS'),
        ('left', 'DOTTED_NAME_PREC'),
        ('left', '.'),
        ('left', '('),
        )

    def __init__(self):
        self.names = { }

    @_('module_statement')
    def module(self, p):
        return p.module_statement

    @_('module module_statement')
    def module(self, p):
        return f'{p.module}\n{p.module_statement}'

    @_('statement')
    def module_statement(self, p):
        return p.statement

    @_('IMPORT dotted_name ";"')
    def module_statement(self, p):
        return f'import {p.dotted_name}'

    @_('IMPORT NAME "=" dotted_name ";"')
    def module_statement(self, p):
        return f'import {p.dotted_name} as {p.NAME}'

    @_('empty')
    def params(self, p):
        return f'[[none]]'

    @_('params_list')
    def params(self, p):
        return p.params_list

    @_('param')
    def params_list(self, p):
        return p.param

    @_('params_list "," param')
    def params_list(self, p):
        return f'{p.params_list} , {p.param}'

    @_('typedef NAME')
    def param(self, p):
        return f'{p.typedef} {p.NAME}'

    @_('NAME %prec DOTTED_NAME_PREC')
    def dotted_name(self, p):
        return f'{p.NAME}'

    @_('dotted_name "." NAME %prec DOTTED_NAME_PREC')
    def dotted_name(self, p):
        return f'{p.dotted_name} . {p.NAME}'

    @_('dotted_name')
    def typedef(self, p):
        return f'type:{p.dotted_name}'

    @_('typedef "&"')
    def typedef(self, p):
        return f'ref({p.typedef})'

    @_('typedef "[" "]"')
    def typedef(self, p):
        return f'array({p.typedef})'

    @_('typedef "[" expr "]"')
    def typedef(self, p):
        return f'array({p.typedef})[{p.expr}]'

    @_('typedef "(" ")"')
    def typedef(self, p):
        return f'buffer({p.typedef})'

    @_('typedef "(" expr ")"')
    def typedef(self, p):
        return f'buffer({p.typedef})[{p.expr}]'

    @_('function')
    def module_statement(self, p):
        return p.function

    @_('ENUM NAME "{" enumerators optional_colon "}"')
    def module_statement(self, p):
        return f'enum {p.NAME} << {p.enumerators} >>'

    @_('enumerator')
    def enumerators(self, p):
        return p.enumerator

    @_('enumerators "," enumerator')
    def enumerators(self, p):
        return f'{p.enumerators} ;; {p.enumerator}'

    @_('NAME enum_value')
    def enumerator(self, p):
        return f'{p.NAME} = {p.enum_value}'

    @_('empty')
    def enum_value(self, p):
        return f'[default]'

    @_('","')
    def optional_colon(self, p):
        return " additional ','"

    @_('empty')
    def optional_colon(self, p):
        return f''

    @_('"=" expr')
    def enum_value(self, p):
        return p.expr

    @_('FUNCTION NAME "(" params ")" statement')
    def function(self, p):
        return f'function {p.NAME} ( {p.params} ) {p.statement}'

    @_('STRUCT NAME parent "{" fields "}"')
    def module_statement(self, p):
        return f'{p.STRUCT} {p.NAME} ( {p.parent} ) << {p.fields} >>'

    @_('empty')
    def parent(self, p):
        return ''

    @_('":" dotted_name')
    def parent(self, p):
        return p.dotted_name

    @_('fields field')
    def fields(self, p):
        return f'{p.fields} ;; {p.field}'

    @_('field')
    def fields(self, p):
        return p.field

    @_('typedef NAME ";"')
    def field(self, p):
        return f'{p.typedef} {p.NAME}'

    @_('function')
    def field(self, p):
        return p.function

    @_('STRUCT inner_name parent "{" fields "}"')
    def field(self, p):
        return f'{p.STRUCT} {p.inner_name} ( {p.parent} ) << {p.fields} >>'

    @_('NAME')
    def inner_name(self, p):
        return p.NAME

    @_('empty')
    def inner_name(self, p):
        return '[[anonymous]]'

    @_('";"')
    def field(self, p):
        return '[[empty]]'

    @_('statement_without_semicolon')
    def statement(self, p):
        return p.statement_without_semicolon

    @_('statement_with_semicolon ";"')
    def statement(self, p):
        return p.statement_with_semicolon

    @_('IF "(" expr ")" statement %prec IFPREC')
    def statement_without_semicolon(self, p):
        return f'[ if {p.expr} then {p.statement} ]'

    @_('IF "(" expr ")" statement ELSE statement')
    def statement_without_semicolon(self, p):
        return f'[ if {p.expr} then {p.statement0} else {p.statement1} ]'

    @_('SWITCH "(" expr ")" "{" cases "}"')
    def statement_without_semicolon(self, p):
        return f'[ switch ({p.expr}) << {p.cases} >> ]'

    @_('case')
    def cases(self, p):
        return p.case

    @_('cases case')
    def cases(self, p):
        return f'{p.cases} ;; {p.case}'

    @_('block')
    def block_or_empty(self, p):
        return p.block

    @_('empty')
    def block_or_empty(self, p):
        return '[[empty case]]'

    @_('CASE expr ":" block_or_empty')
    def case(self, p):
        return f'case {p.expr}: {p.block_or_empty}'

    @_('DEFAULT ":" block_or_empty')
    def case(self, p):
        return f'default: {p.block_or_empty}'

    @_('FOR "(" statement expr ";" loop_statement ")" statement')
    def statement_without_semicolon(self, p):
        return f'for ({p.statement0} ;; {p.expr} ;; {p.loop_statement}) << {p.statement1} >>'

    @_('FOR "(" statement ";" loop_statement ")" statement')
    def statement_without_semicolon(self, p):
        return f'for ({p.statement0} ;; [[forever]] ;; {p.loop_statement}) << {p.statement1} >>'

    @_('statement_without_semicolon')
    def loop_statement(self, p):
        return p.statement_without_semicolon

    @_('statement_with_semicolon')
    def loop_statement(self, p):
        return p.statement_with_semicolon

    @_('WHILE "(" expr ")" statement')
    def statement_without_semicolon(self, p):
        return f'[ while {p.expr} then {p.statement} ]'

    @_('DO statement WHILE "(" expr ")"')
    def statement_without_semicolon(self, p):
        return f'[ {p.statement} when {p.expr} ]'

    @_('CONTINUE')
    def statement_with_semicolon(self, p):
        return f'[ continue ]'

    @_('break_list CONTINUE')
    def statement_with_semicolon(self, p):
        return f'[ break {str(p.break_list)} and continue ]'

    @_('break_list')
    def statement_with_semicolon(self, p):
        return f'[ break {str(p.break_list)} ]'

    @_('BREAK')
    def break_list(self, p):
        return 1

    @_('break_list BREAK')
    def break_list(self, p):
        return p.break_list + 1

    @_('NAME "=" expr')
    def statement_with_semicolon(self, p):
        return f'[ {p.NAME} = {p.expr} ]'

    @_('expr "." NAME "=" expr')
    def statement_with_semicolon(self, p):
        return f'[ {p.expr0} . {p.NAME} = {p.expr1} ]'

    @_('VAR typedef NAME')
    def statement_with_semicolon(self, p):
        return f'[ {p.NAME} = {p.typedef} ]'

    @_('DELEGATE NAME "(" params ")" ";"')
    def module_statement(self, p):
        return f'delegate {p.NAME} ( {p.params} )'

    @_('"{" block "}"')
    def statement_without_semicolon(self, p):
        return f'[[[\n{p.block}\n]]]'

    @_('RETURN')
    def statement_with_semicolon(self, p):
        return f'return'

    @_('RETURN expr')
    def statement_with_semicolon(self, p):
        return f'return {p.expr}'

    @_('statement')
    def block(self, p):
        return p.statement

    @_('block statement')
    def block(self, p):
        return f'{p.block}\n{p.statement}'

    @_('')
    def empty(self, p):
        pass

    @_('empty')
    def args(self, p):
        return f'[[none]]'

    @_('args_list')
    def args(self, p):
        return p.args_list

    @_('expr')
    def args_list(self, p):
        return p.expr

    @_('args_list "," expr')
    def args_list(self, p):
        return f'{p.args_list} , {p.expr}'

    @_('expr "(" args ")"')
    def expr(self, p):
        return f'[ {p.expr} (( {p.args} )) ]'

    @_('expr "." NAME')
    def expr(self, p):
        return f'[ {p.expr} . {p.NAME} ]'

    @_('empty')
    def statement_with_semicolon(self, p):
        return f'[ empty stmt ]'

    @_('expr')
    def statement_with_semicolon(self, p):
        return p.expr

    @_('expr "+" expr')
    def expr(self, p):
        return f'[ {p.expr0} + {p.expr1} ]'

    @_('expr "-" expr')
    def expr(self, p):
        return f'[ {p.expr0} - {p.expr1} ]'

    @_('expr "*" expr')
    def expr(self, p):
        return f'[ {p.expr0} * {p.expr1} ]'

    @_('expr "/" expr')
    def expr(self, p):
        return f'[ {p.expr0} / {p.expr1} ]'

    @_('"-" expr %prec UMINUS')
    def expr(self, p):
        return f'[ -{p.expr} ]'

    @_('"(" expr ")"')
    def expr(self, p):
        return f'[ ( {p.expr} ) ]'

    @_('NUMBER')
    def expr(self, p):
        return str(p.NUMBER)

    @_('NAME')
    def expr(self, p):
        return f'`{p.NAME}`'

    def error(*args):
        print(args)


text = '''
if (x) if (a) b; else c; else d;
a.b.c = 1;
(2 + 2).sum = 123.add.some.yuu.hjhg(123);
f();
f(1);
f(1,2+1,3+b,-f(123,33));
a = b.c;
function f(mod.a(x)&[5] b)
{
    a = 1;
    b = b + 1;
}
var int(8)& a;
a.b + 1;
union a : a.b {
    int a;
    byte(4) str;
    function get(int x) {
        a = 1;
    }
    union {
        int x;
        byte some;
        struct : data {
            cdn s;
        }
    }
}
while (1) {
    a = a + 1;
}
do
    a = a + 1;
while (1);
break break continue;
continue;
break;
break break;
switch (a)
{
    case 1:
        a = 2;
        x = 1;
        break;
    case 3:
    case 2:
    case x + 3:
        break continue;
    default:
}
enum Test {
    VAL1 = 1,
    VAR2,
    VAR88 = 88 + 1 + Test.x + 1,
}
for (a;a;a)
{
    print(i);
}
return;
return 12;
import a.some;
import some = a.b.some;
'''

lexer = CalcLexer()
parser = CalcParser()
tokens = lexer.tokenize(text)
tree = parser.parse(tokens)
print(tree)