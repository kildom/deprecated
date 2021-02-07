import sys
import re
import json
from sly import Lexer, Parser
import sly

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
        FP_NUMBER, HEX_NUMBER, OCT_NUMBER, BIN_NUMBER, INV_NUMBER, DEC_NUMBER,
        STRING, CHAR,
        NAME, IF, ELSE, FUNCTION, DELEGATE, VAR, STRUCT,
        WHILE, DO, BREAK, CONTINUE, SWITCH, CASE, DEFAULT,
        ENUM, FOR, RETURN, IMPORT, LE, GE, EQ, NE,
        TRY, CATCH, FINALLY, NEW, DELETE, PP, MM, AND, OR, SHL, SHR, THROW, CMP_ASSIGN }
    ignore = ' \t\r\n'
    literals = {
        '=', '+', '-', '*', '/',
        '(', ')', ';', '.', ',', '[', ']', "&", '{', '}',
        ':', '<', '>', '`', '~', '@'
    }

    # Tokens
    CMP_ASSIGN = r'\+=|-=|\*=|\/=|%=|>>=|<<=|&=|\^=|\|=|&&=|\|\|='
    SHL = '<<'
    SHR = '>>'
    AND = '&&'
    OR = r'\|\|'
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
    STRING = r'"(\\"|[^"])*"'
    CHAR = r"'(\\'|[^'])*'"

    FP_NUMBER = r'[0-9]*([0-9]\.|\.[0-9])[0-9]*(?:[Ee][+-]?[0-9]+)?|[0-9]+[Ee][+-]?[0-9]+'
    HEX_NUMBER = r'0[Xx][\da-fA-F]+'
    OCT_NUMBER = r'0[Oo][0-7]+'
    BIN_NUMBER = r'0[Bb][01]+'
    INV_NUMBER = r'0\d+'
    DEC_NUMBER = r'\d+'

    def error(self, t):
        print("Illegal character '%s'" % t.value[0])
        self.index += 1

class NS:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            self.__dict__[k] = v

class UVMSParser(Parser):
    _ = _
    debugfile = 'parser.out'
    tokens = UVMSLexer.tokens

    precedence = (
        ('right', 'ELSE', 'IFPREC'),
        ('left', ':'),
        ('left', 'OR'),
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
        return NS(T='Module', items=[p.module_statement])

    @_('module module_statement')
    def module(self, p):
        p.module.items.append(p.module_statement)
        return p.module

    @_('statement')
    def module_statement(self, p):
        return p.statement

    @_('IMPORT dotted_name ";"')
    def module_statement(self, p):
        return NS(T='Import', module=p.dotted_name, alias=None)

    @_('IMPORT NAME "=" dotted_name ";"')
    def module_statement(self, p):
        return NS(T='Import', module=p.dotted_name, alias=p.NAME)

    @_('empty')
    def params(self, p):
        return [ ]

    @_('params_list')
    def params(self, p):
        return p.params_list

    @_('param')
    def params_list(self, p):
        return [ p.param ]

    @_('params_list "," param')
    def params_list(self, p):
        p.params_list.append(p.param)
        return p.params_list

    @_('typedef NAME')
    def param(self, p):
        return NS(T='Param', type=p.typedef, name=p.NAME)

    @_('NAME %prec DOTTED_NAME_PREC')
    def dotted_name(self, p):
        return [ p.NAME ]

    @_('dotted_name "." NAME %prec DOTTED_NAME_PREC')
    def dotted_name(self, p):
        p.dotted_name.append(p.NAME)
        return p.dotted_name

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
        return NS(T='Enum', name=p.NAME, items=p.enumerators)

    @_('enumerator')
    def enumerators(self, p):
        return [ p.enumerator ]

    @_('enumerators "," enumerator')
    def enumerators(self, p):
        p.enumerators.append(p.enumerator)
        return p.enumerators

    @_('NAME enum_value')
    def enumerator(self, p):
        return NS(T='Enumerator', name=p.NAME, value=p.enum_value)

    @_('empty')
    def enum_value(self, p):
        return None

    @_('"=" expr')
    def enum_value(self, p):
        return p.expr

    @_('","')
    def optional_colon(self, p):
        pass

    @_('empty')
    def optional_colon(self, p):
        pass

    @_('FUNCTION typedef NAME "(" params ")" statement')
    def function(self, p):
        return NS(T='Function', name=p.NAME, returns=p.typedef, params=p.params, body=p.statement)

    @_('FUNCTION NAME "(" params ")" statement')
    def function(self, p):
        return NS(T='Function', name=p.NAME, returns=None, params=p.params, body=p.statement)

    @_('STRUCT NAME parent "{" fields "}"')
    def module_statement(self, p):
        return NS(T='Struct', union=(p.STRUCT == 'union'), name=p.NAME, parent=p.parent, items=p.fields)

    @_('empty')
    def parent(self, p):
        return None

    @_('":" dotted_name')
    def parent(self, p):
        return p.dotted_name

    @_('fields field')
    def fields(self, p):
        if p.field is not None:
            p.fields.append(p.field)
        return p.fields

    @_('field')
    def fields(self, p):
        if p.field is not None:
            return [ p.field ]
        return [ ]

    @_('typedef NAME ";"')
    def field(self, p):
        return NS(T='Field', name=p.NAME, type=p.typedef)

    @_('function')
    def field(self, p):
        return p.function

    @_('STRUCT inner_name parent "{" fields "}"')
    def field(self, p):
        return NS(T='InnerStruct', union=(p.STRUCT == 'union'), name=p.inner_name, parent=p.parent, items=p.fields)

    @_('NAME')
    def inner_name(self, p):
        return p.NAME

    @_('empty')
    def inner_name(self, p):
        return None

    @_('";"')
    def field(self, p):
        return None

    @_('statement_without_semicolon')
    def statement(self, p):
        return p.statement_without_semicolon

    @_('statement_with_semicolon ";"')
    def statement(self, p):
        return p.statement_with_semicolon

    @_('TRY "{" block "}" catch_list final')
    def statement_without_semicolon(self, p):
        return NS(T='Try', body=p.block, catches=p.catch_list, final=p.final)

    @_('catch_list catch')
    def catch_list(self, p):
        p.catch_list.append(p.catch)
        return p.catch_list

    @_('catch')
    def catch_list(self, p):
        return [ p.catch ]

    @_('CATCH "(" expr ")" statement')
    def catch(self, p):
        return NS(T='Catch', expr=p.expr, statement=p.statement)

    @_('CATCH "(" ")" statement')
    def catch(self, p):
        return NS(T='Catch', expr=None, statement=p.statement)

    @_('FINALLY statement')
    def final(self, p):
        return p.statement

    @_('empty')
    def final(self, p):
        return None

    @_('IF "(" expr ")" statement %prec IFPREC')
    def statement_without_semicolon(self, p):
        return NS(T='If', condition=p.expr, then=p.statement, otherwise=None)

    @_('IF "(" expr ")" statement ELSE statement')
    def statement_without_semicolon(self, p):
        return NS(T='If', condition=p.expr, then=p.statement0, otherwise=p.statement1)

    @_('SWITCH "(" expr ")" "{" cases "}"')
    def statement_without_semicolon(self, p):
        return NS(T='Switch', value=p.expr, cases=p.cases)

    @_('case')
    def cases(self, p):
        return [ p.case ]

    @_('cases case')
    def cases(self, p):
        p.cases.append(p.case)
        return p.cases

    @_('CASE expr ":" block')
    def case(self, p):
        return NS(T='Case', value=p.expr, body=p.block)

    @_('DEFAULT ":" block')
    def case(self, p):
        return NS(T='Case', value=None, body=p.block)

    @_('FOR "(" loop_init expr ";" loop_statement ")" statement')
    def statement_without_semicolon(self, p):
        return NS(T='For', init=p.loop_init, condition=p.expr, iteration=p.loop_statement, body=p.statement)

    @_('FOR "(" loop_init ";" loop_statement ")" statement')
    def statement_without_semicolon(self, p):
        return NS(T='For', init=p.loop_init, condition=None, iteration=p.loop_statement, body=p.statement)

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
        return NS(T='While', condition=p.expr, body=p.statement)

    @_('DO statement WHILE "(" expr ")"')
    def statement_without_semicolon(self, p):
        return NS(T='DoWhile', condition=p.expr, body=p.statement)

    @_('CONTINUE')
    def statement_with_semicolon(self, p):
        return NS(T='Break', breaks=0, contin=True)

    @_('THROW expr "," expr')
    def statement_with_semicolon(self, p):
        return NS(T='Throw', type=p.expr0, code=p.expr1)

    @_('THROW expr')
    def statement_with_semicolon(self, p):
        return NS(T='Throw', type=p.expr, code=None)

    @_('break_list CONTINUE')
    def statement_with_semicolon(self, p):
        return NS(T='Break', breaks=p.break_list, contin=True)

    @_('break_list')
    def statement_with_semicolon(self, p):
        return NS(T='Break', breaks=p.break_list, contin=False)

    @_('BREAK')
    def break_list(self, p):
        return 1

    @_('break_list BREAK')
    def break_list(self, p):
        return p.break_list + 1

    @_('NAME')
    def assignee(self, p):
        return NS(T='DirectAssignee', name=p.NAME)

    @_('expr "." NAME')
    def assignee(self, p):
        return NS(T='FieldAssignee', object=p.expr, name=p.NAME)

    @_('expr "[" expr "]"')
    def assignee(self, p):
        return NS(T='ItemAssignee', array=p.expr0, index=p.expr1)

    @_('assignee "=" expr')
    def statement_with_semicolon(self, p):
        return NS(T='Assign', assignee=p.assignee, value=p.expr)

    @_('assignee CMP_ASSIGN expr')
    def statement_with_semicolon(self, p):
        return NS(T='CompoundAssign', op=p.CMP_ASSIGN[0:-1], assignee=p.assignee, value=p.expr)

    @_('assignee PP')
    def statement_with_semicolon(self, p):
        return NS(T='IncDecAssign', op='++', assignee=p.assignee)

    @_('assignee MM')
    def statement_with_semicolon(self, p):
        return NS(T='IncDecAssign', op='--', assignee=p.assignee)

    @_('VAR typedef NAME')
    def statement_with_semicolon(self, p):
        return NS(T='Variable', name=p.NAME, type=p.typedef)

    @_('DELEGATE NAME "(" params ")" ";"')
    def module_statement(self, p):
        return NS(T='Delegate', name=p.NAME, returns=None, params=p.params)

    @_('DELEGATE typedef NAME "(" params ")" ";"')
    def module_statement(self, p):
        return NS(T='Delegate', name=p.NAME, returns=p.typedef, params=p.params)

    @_('"{" block "}"')
    def statement_without_semicolon(self, p):
        return NS(T='Block', body=p.block)

    @_('NEW "(" typedef ")"')
    def expr(self, p):
        return f'new {p.typedef}'

    @_('DELETE "(" expr ")"')
    def statement_with_semicolon(self, p):
        return NS(T='Delete', value=p.expr)

    @_('RETURN')
    def statement_with_semicolon(self, p):
        return NS(T='Return', value=None)

    @_('RETURN expr')
    def statement_with_semicolon(self, p):
        return NS(T='Return', value=p.expr)

    @_('empty')
    def block(self, p):
        return [ ]

    @_('block statement')
    def block(self, p):
        if p.statement.T != 'Empty':
            p.block.append(p.statement)
        return p.block

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
        return NS(T='Empty')

    @_('expr')
    def statement_with_semicolon(self, p):
        return NS(T='ExpressionStatement', expr=p.expr)

    @_('expr "?" expr ":" expr')
    def expr(self, p):
        return NS(T='Conditional', condition=p.expr0, then=p.expr1, otherwise=p.expr2)

    @_('expr "+" expr')
    def expr(self, p):
        return NS(T='AddOperator', left=p.expr0, right=p.expr1)

    @_('expr "-" expr')
    def expr(self, p):
        return NS(T='SubOperator', left=p.expr0, right=p.expr1)

    @_('expr "*" expr')
    def expr(self, p):
        return NS(T='MulOperator', left=p.expr0, right=p.expr1)

    @_('expr "/" expr')
    def expr(self, p):
        return NS(T='DivOperator', left=p.expr0, right=p.expr1)

    @_('expr "%" expr')
    def expr(self, p):
        return NS(T='ModOperator', left=p.expr0, right=p.expr1)

    @_('expr "<" expr')
    def expr(self, p):
        return NS(T='CompareOperator', op='<', left=p.expr0, right=p.expr1)

    @_('expr LE expr')
    def expr(self, p):
        return NS(T='CompareOperator', op='<=', left=p.expr0, right=p.expr1)

    @_('expr ">" expr')
    def expr(self, p):
        return NS(T='CompareOperator', op='>', left=p.expr0, right=p.expr1)

    @_('expr GE expr')
    def expr(self, p):
        return NS(T='CompareOperator', op='>=', left=p.expr0, right=p.expr1)

    @_('expr EQ expr')
    def expr(self, p):
        return NS(T='CompareOperator', op='==', left=p.expr0, right=p.expr1)

    @_('expr NE expr')
    def expr(self, p):
        return NS(T='CompareOperator', op='!=', left=p.expr0, right=p.expr1)

    @_('expr "&" expr')
    def expr(self, p):
        return NS(T='BitAndOperator', left=p.expr0, right=p.expr1)

    @_('expr "|" expr')
    def expr(self, p):
        return NS(T='BitOrOperator', left=p.expr0, right=p.expr1)

    @_('expr "^" expr')
    def expr(self, p):
        return NS(T='BitXorOperator', left=p.expr0, right=p.expr1)

    @_('expr AND expr')
    def expr(self, p):
        return NS(T='LogicAndOperator', left=p.expr0, right=p.expr1)

    @_('expr OR expr')
    def expr(self, p):
        return NS(T='LogicOrOperator', left=p.expr0, right=p.expr1)

    @_('expr SHR expr')
    def expr(self, p):
        return NS(T='ShiftRightOperator', left=p.expr0, right=p.expr1)

    @_('expr SHL expr')
    def expr(self, p):
        return NS(T='ShiftLeftOperator', left=p.expr0, right=p.expr1)

    @_('"-" expr %prec UMINUS')
    def expr(self, p):
        return NS(T='MinusOperator', left=p.expr)

    @_('"+" expr %prec UPLUS')
    def expr(self, p):
        return NS(T='PlusOperator', left=p.expr)

    @_('"!" expr %prec UPLUS')
    def expr(self, p):
        return NS(T='NotOperator', left=p.expr)

    @_('"~" expr %prec UPLUS')
    def expr(self, p):
        return NS(T='BitInversionOperator', left=p.expr)

    @_('"&" expr %prec UPLUS')
    def expr(self, p):
        return NS(T='ReferenceOperator', left=p.expr)

    @_('expr "@" typedef')
    def expr(self, p):
        return NS(T='TypeCast', value=p.expr, type=p.typedef)

    @_('brackets')
    def expr(self, p):
        return p.brackets

    @_('"(" expr ")"')
    def brackets(self, p):
        return p.expr

    @_('HEX_NUMBER')
    def expr(self, p):
        return NS(T='IntLiteral', base=16, value=p.HEX_NUMBER[2:])

    @_('OCT_NUMBER')
    def expr(self, p):
        return NS(T='IntLiteral', base=8, value=p.OCT_NUMBER[2:])

    @_('BIN_NUMBER')
    def expr(self, p):
        return NS(T='IntLiteral', base=2, value=p.BIN_NUMBER[2:])

    @_('DEC_NUMBER')
    def expr(self, p):
        return NS(T='IntLiteral', base=10, value=p.DEC_NUMBER)

    @_('INV_NUMBER')
    def expr(self, p):
        raise Exception('Decimal number with zero prefix is not allowed.')

    @_('FP_NUMBER')
    def expr(self, p):
        return NS(T='FloatLiteral', value=p.FP_NUMBER)

    @_('NAME')
    def expr(self, p):
        return NS(T='Identifier', name=p.NAME)

    def unescape_string(self, s):
        s = s[1:-1]
        return s # TODO: Unscape string

    @_('STRING')
    def expr(self, p):
        return NS(T='StringLiteral', value=self.unescape_string(p.STRING))

    @_('CHAR')
    def expr(self, p):
        return NS(T='CharLiteral', value=self.unescape_string(p.CHAR))

    def error(*args):
        print(args)


text = '''1e10;

'''

lexer = UVMSLexer()
parser = UVMSParser()
tokens = lexer.tokenize(text)
tree = parser.parse(tokens)
print(tree)


class Enc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, NS):
            return o.__dict__
        return None

print(json.dumps(tree, cls=Enc, indent='\t'))
