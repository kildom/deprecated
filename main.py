from sly import Lexer, Parser
import sly
import sys

class SlyLoggerFilter(object):
    def warning(self, msg, *args, **kwargs):
        text = 'WARNING: ' + (msg % args) + '\n'
        #if text == 'WARNING: 2 shift/reduce conflicts\n' and self.f == sys.stderr:
        #    return
        SlyLoggerFilter.old(self, msg, *args, **kwargs)

SlyLoggerFilter.old = sly.yacc.SlyLogger.warning
sly.yacc.SlyLogger.warning = SlyLoggerFilter.warning

class UVMSLexer(Lexer):
    _ = _
    tokens = {
        NAME, NUMBER, IF, ELSE, FUNCTION, DELEGATE, VAR, STRUCT,
        WHILE, DO, BREAK, CONTINUE, SWITCH, CASE, DEFAULT,
        ENUM, FOR, RETURN, IMPORT, LE, GE, EQ, NE,
        TRY, CATCH, FINALLY, NEW, DELETE, PP, MM, AND, OR, SHL, SHR, THROW, CMP_ASSIGN, XOR }
    ignore = ' \t\r\n'
    literals = {
        '=', '+', '-', '*', '/',
        '(', ')', ';', '.', ',', '[', ']', "&", '{', '}',
        ':', '<', '>', '`', '~', '@'
    }

    # Tokens
    CMP_ASSIGN = r'\+=|-=|\*=|\/=|%=|>>=|<<=|&=|\^=|\|=|&&=|\^\^=|\|\|='
    SHL = '<<'
    SHR = '>>'
    AND = '&&'
    OR = r'\|\|'
    XOR = r'\^\^'
    PP = '\+\+'
    MM = '--'
    GE = '>='
    LE = '<='
    EQ = '=='
    NE = '!='
    THROW = 'throw'
    NEW = 'new'
    DELETE = 'delete'
    TRY = 'try'
    CATCH = 'catch'
    FINALLY = 'finally'
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

    HEX_NUMBER = r'0[Xx][\da-fA-F]+'
    OCT_NUMBER = r'0[Oo][0-7]+'
    BIN_NUMBER = r'0[Bb][01]+'
    INV_NUMBER = r'0\d+'
    DEC_NUMBER = r'\d+'

    def error(self, t):
        print("Illegal character '%s'" % t.value[0])
        self.index += 1

class UVMSParser(Parser):
    _ = _
    debugfile = 'parser.out'
    tokens = UVMSLexer.tokens

    precedence = (
        ('right', 'ELSE', 'IFPREC'),
        ('left', ':'),
        ('left', 'OR'),
        ('left', 'XOR'),
        ('left', 'AND'),
        ('left', '|'),
        ('left', '^'),
        ('left', '&'),
        ('left', 'EQ', 'NE'),
        ('left', '<', 'LE', '>', 'GE'),
        ('left', 'SHL', 'SHR'),
        ('left', '+', '-'),
        ('left', '*', '/', '%'),
        ('right', 'UMINUS', 'UPLUS'),
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

    @_('typedef AND')
    def typedef(self, p):
        return f'ref-ref({p.typedef}))'

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

    @_('TRY "{" block "}" catch_list')
    def statement_without_semicolon(self, p):
        return f'try {p.block} {p.catch_list}'

    @_('catch_list catch')
    def catch_list(self, p):
        return f'{p.catch_list} {p.catch}'

    @_('catch')
    def catch_list(self, p):
        return p.catch

    @_('CATCH "(" expr ")" statement')
    def catch(self, p):
        return f'catch ({p.expr}) {p.statement}'

    @_('CATCH "(" ")" statement')
    def catch(self, p):
        return f'catch ([ALL]) {p.statement}'

    @_('FINALLY statement')
    def catch(self, p):
        return f'finally {p.statement}'

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

    @_('CASE expr ":" block')
    def case(self, p):
        return f'case {p.expr}: {p.block}'

    @_('DEFAULT ":" block')
    def case(self, p):
        return f'default: {p.block}'

    @_('FOR "(" loop_init expr ";" loop_statement ")" statement')
    def statement_without_semicolon(self, p):
        return f'for ({p.loop_init} ;; {p.expr} ;; {p.loop_statement}) << {p.statement} >>'

    @_('FOR "(" loop_init ";" loop_statement ")" statement')
    def statement_without_semicolon(self, p):
        return f'for ({p.loop_init} ;; [[forever]] ;; {p.loop_statement}) << {p.statement} >>'

    @_('statement_without_semicolon ";"')
    def loop_init(self, p):
        return p.statement_without_semicolon

    @_('statement_with_semicolon ";"')
    def loop_init(self, p):
        return p.statement_with_semicolon

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

    @_('THROW expr "," expr')
    def statement_with_semicolon(self, p):
        return f'[ throw {p.expr0}, {p.expr1} ]'

    @_('THROW expr')
    def statement_with_semicolon(self, p):
        return f'[ throw {p.expr} ]'

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

    @_('NAME')
    def lexpr(self, p):
        return p.NAME

    @_('expr "." NAME')
    def lexpr(self, p):
        return f'{p.expr} . {p.NAME}'

    @_('expr "[" expr "]"')
    def lexpr(self, p):
        return f'{p.expr0} [ {p.expr1} ]'

    @_('lexpr "=" expr')
    def statement_with_semicolon(self, p):
        return f'[ {p.lexpr} = {p.expr} ]'

    @_('lexpr CMP_ASSIGN expr')
    def statement_with_semicolon(self, p):
        return f'[ {p.lexpr} {p.CMP_ASSIGN} {p.expr} ]'

    @_('lexpr PP')
    def statement_with_semicolon(self, p):
        return f'[ {p.lexpr} ++ ]'

    @_('lexpr MM')
    def statement_with_semicolon(self, p):
        return f'[ {p.lexpr} -- ]'

    @_('VAR typedef NAME')
    def statement_with_semicolon(self, p):
        return f'[ {p.NAME} = {p.typedef} ]'

    @_('DELEGATE NAME "(" params ")" ";"')
    def module_statement(self, p):
        return f'delegate {p.NAME} ( {p.params} )'

    @_('"{" block "}"')
    def statement_without_semicolon(self, p):
        return f'[[[\n{p.block}\n]]]'

    @_('NEW "(" typedef ")"')
    def expr(self, p):
        return f'new {p.typedef}'

    @_('DELETE "(" expr ")"')
    def statement_with_semicolon(self, p):
        return f'delete {p.expr}'

    @_('RETURN')
    def statement_with_semicolon(self, p):
        return f'return'

    @_('RETURN expr')
    def statement_with_semicolon(self, p):
        return f'return {p.expr}'

    @_('empty')
    def block(self, p):
        return ''

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

    @_('expr "[" expr "]"')
    def expr(self, p):
        return f'[ {p.expr} [[ {p.expr} ]] ]'

    @_('expr "." NAME')
    def expr(self, p):
        return f'[ {p.expr} . {p.NAME} ]'

    @_('empty')
    def statement_with_semicolon(self, p):
        return f'[ empty stmt ]'

    @_('expr')
    def statement_with_semicolon(self, p):
        return p.expr

    @_('expr "?" expr ":" expr')
    def expr(self, p):
        return f'[ {p.expr0} + {p.expr1} ]'

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

    @_('expr "%" expr')
    def expr(self, p):
        return f'[ {p.expr0} % {p.expr1} ]'

    @_('expr "<" expr')
    def expr(self, p):
        return f'[ {p.expr0} < {p.expr1} ]'

    @_('expr LE expr')
    def expr(self, p):
        return f'[ {p.expr0} <= {p.expr1} ]'

    @_('expr ">" expr')
    def expr(self, p):
        return f'[ {p.expr0} > {p.expr1} ]'

    @_('expr GE expr')
    def expr(self, p):
        return f'[ {p.expr0} >= {p.expr1} ]'

    @_('expr EQ expr')
    def expr(self, p):
        return f'[ {p.expr0} == {p.expr1} ]'

    @_('expr NE expr')
    def expr(self, p):
        return f'[ {p.expr0} != {p.expr1} ]'

    @_('expr "&" expr')
    def expr(self, p):
        return f'[ {p.expr0} & {p.expr1} ]'

    @_('expr "|" expr')
    def expr(self, p):
        return f'[ {p.expr0} | {p.expr1} ]'

    @_('expr "^" expr')
    def expr(self, p):
        return f'[ {p.expr0} ^{p.expr1} ]'

    @_('expr AND expr')
    def expr(self, p):
        return f'[ {p.expr0} && {p.expr1} ]'

    @_('expr OR expr')
    def expr(self, p):
        return f'[ {p.expr0} || {p.expr1} ]'

    @_('expr XOR expr')
    def expr(self, p):
        return f'[ {p.expr0} ^^ {p.expr1} ]'

    @_('expr SHR expr')
    def expr(self, p):
        return f'[ {p.expr0} >> {p.expr1} ]'

    @_('expr SHL expr')
    def expr(self, p):
        return f'[ {p.expr0} << {p.expr1} ]'

    @_('"-" expr %prec UMINUS')
    def expr(self, p):
        return f'[ -{p.expr} ]'

    @_('"+" expr %prec UPLUS')
    def expr(self, p):
        return f'[ +{p.expr} ]'

    @_('"!" expr %prec UPLUS')
    def expr(self, p):
        return f'[ !{p.expr} ]'

    @_('"~" expr %prec UPLUS')
    def expr(self, p):
        return f'[ ~{p.expr} ]'

    @_('"&" expr %prec UPLUS')
    def expr(self, p):
        return f'[ ref {p.expr} ]'

    @_('expr "@" typedef')
    def expr(self, p):
        return f'[ ((({p.typedef}))){p.expr} ]'

    @_('brackets')
    def expr(self, p):
        return f'[ {p.brackets} ]'

    @_('"(" expr ")"')
    def brackets(self, p):
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
x &&= true;
x.y /= 13;
x[i] ^= 33 ^^ 2;
for (a;a;a)
{
    aa = 12;
}
'''

lexer = UVMSLexer()
parser = UVMSParser()
tokens = lexer.tokenize(text)
tree = parser.parse(tokens)
print(tree)