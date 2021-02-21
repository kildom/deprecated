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

class ErrorReport:
    def error(self, text, loc):
        print(f'{loc}:error: {text}') # TODO: put it into stderr


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
        ':', '<', '>', '`', '~', '@', '?'
    }

    ignore_hash_comment = r'\#[^\r\n]*'
    ignore_oneline_comment = r'\/\/[^\r\n]*'
    ignore_multiline_comment = r'\/\*[\s\S]*?\*\/'

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

    def __init__(self):
        super().__init__()
        self.rep = ErrorReport()

    def error(self, t):
        self.rep.error(f'Illegal character `{t.value[0]}`', t.index)
        self.index += 1

class NS:
    def __init__(self, p, **kwargs):
        for k, v in kwargs.items():
            self.__dict__[k] = v
        m = 1000000000
        for k, v in kwargs.items():
            if hasattr(v, 'loc') and v.loc is not None:
                m = min(m, v.loc)
            if hasattr(v, '_loc_begin') and v._loc_begin is not None:
                m = min(m, v._loc_begin)
            if type(v) is list:
                for vv in v:
                    if hasattr(vv, 'loc') and vv.loc is not None:
                        m = min(m, vv.loc)
                    if hasattr(vv, '_loc_begin') and vv._loc_begin is not None:
                        m = min(m, vv._loc_begin)
        if 'loc' in kwargs:
            pass
        elif hasattr(p, 'index'):
            self.loc = p.index
            self._loc_begin = min(p.index, m)
        elif m != 1000000000:
            self.loc = m
            self._loc_begin = m
        else:
            raise Exception('Internal error') # TODO: make sure that this will never happen

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
        super().__init__()
        self.rep = ErrorReport()

    @_('module_statement')
    def module(self, p):
        return NS(p, T='Module', items=[p.module_statement])

    @_('module module_statement')
    def module(self, p):
        p.module.items.append(p.module_statement)
        return p.module

    @_('statement')
    def module_statement(self, p):
        return p.statement

    @_('IMPORT dotted_name ";"')
    def module_statement(self, p):
        return NS(p, T='Import', module=p.dotted_name.names, alias=None)

    @_('IMPORT NAME "=" dotted_name ";"')
    def module_statement(self, p):
        return NS(p, T='Import', module=p.dotted_name.names, alias=p.NAME)

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
        return NS(p, T='Param', type=p.typedef, name=p.NAME)

    @_('NAME %prec DOTTED_NAME_PREC')
    def dotted_name(self, p):
        return NS(p, T='_dotted_name', names=[ p.NAME ])

    @_('dotted_name "." NAME %prec DOTTED_NAME_PREC')
    def dotted_name(self, p):
        p.dotted_name.names.append(p.NAME)
        return p.dotted_name

    @_('dotted_name')
    def typedef(self, p):
        return NS(p, T='Type', name=p.dotted_name.names, postfixes=[ ], loc=p.dotted_name.loc, _loc_begin=p.dotted_name._loc_begin)

    @_('typedef "&"')
    def typedef(self, p):
        p.typedef.postfixes.append(NS(p, T='Ref'))
        return p.typedef

    @_('typedef AND')
    def typedef(self, p):
        p.typedef.postfixes.append(NS(p, T='Ref'))
        p.typedef.postfixes.append(NS(p, T='Ref'))
        return p.typedef

    @_('typedef "[" "]"')
    def typedef(self, p):
        p.typedef.postfixes.append(NS(p, T='Array', size=None))
        return p.typedef

    @_('typedef "[" expr "]"')
    def typedef(self, p):
        p.typedef.postfixes.append(NS(p, T='Array', size=p.expr))
        return p.typedef

    @_('typedef "(" ")"')
    def typedef(self, p):
        p.typedef.postfixes.append(NS(p, T='Buffer', size=None))
        return p.typedef

    @_('typedef "(" expr ")"')
    def typedef(self, p):
        p.typedef.postfixes.append(NS(p, T='Buffer', size=p.expr))
        return p.typedef

    @_('function')
    def module_statement(self, p):
        return p.function

    @_('ENUM NAME "{" enumerators optional_colon "}"')
    def module_statement(self, p):
        return NS(p, T='Enum', name=p.NAME, items=p.enumerators)

    @_('enumerator')
    def enumerators(self, p):
        return [ p.enumerator ]

    @_('enumerators "," enumerator')
    def enumerators(self, p):
        p.enumerators.append(p.enumerator)
        return p.enumerators

    @_('NAME enum_value')
    def enumerator(self, p):
        return NS(p, T='Enumerator', name=p.NAME, value=p.enum_value)

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
        return NS(p, T='Function', name=p.NAME, returns=p.typedef, params=p.params, body=p.statement)

    @_('FUNCTION NAME "(" params ")" statement')
    def function(self, p):
        return NS(p, T='Function', name=p.NAME, returns=None, params=p.params, body=p.statement)

    @_('STRUCT NAME parent "{" fields "}"')
    def module_statement(self, p):
        return NS(p, T='Struct', union=(p.STRUCT == 'union'), name=p.NAME, parent=p.parent, items=p.fields)

    @_('STRUCT NAME parent "{" "}"')
    def module_statement(self, p):
        return NS(p, T='Struct', union=(p.STRUCT == 'union'), name=p.NAME, parent=p.parent, items=[ ])

    @_('empty')
    def parent(self, p):
        return None

    @_('":" dotted_name')
    def parent(self, p):
        return p.dotted_name.names

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
        return NS(p, T='Field', name=p.NAME, type=p.typedef)

    @_('function')
    def field(self, p):
        return p.function

    @_('STRUCT inner_name parent "{" fields "}"')
    def field(self, p):
        return NS(p, T='InnerStruct', union=(p.STRUCT == 'union'), name=p.inner_name, parent=p.parent, items=p.fields)

    @_('STRUCT inner_name parent "{" "}"')
    def field(self, p):
        return NS(p, T='InnerStruct', union=(p.STRUCT == 'union'), name=p.inner_name, parent=p.parent, items=[ ])

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

    def empty_statement_helper(self, p, s):
        if s.T == 'Empty':
            s.loc = p.index
            s._loc_begin = p.index
        return s

    @_('statement_with_semicolon ";"')
    def statement(self, p):
        self.empty_statement_helper(p, p.statement_with_semicolon)
        return p.statement_with_semicolon

    @_('TRY "{" block "}" catch_list final')
    def statement_without_semicolon(self, p):
        return NS(p, T='Try', body=p.block, catches=p.catch_list, final=p.final)

    @_('TRY "{" block "}" final')
    def statement_without_semicolon(self, p):
        return NS(p, T='Try', body=p.block, catches=[ ], final=p.final)

    @_('catch_list catch')
    def catch_list(self, p):
        p.catch_list.append(p.catch)
        return p.catch_list

    @_('catch')
    def catch_list(self, p):
        return [ p.catch ]

    @_('CATCH "(" expr ")" statement')
    def catch(self, p):
        return NS(p, T='Catch', expr=p.expr, statement=p.statement)

    @_('CATCH "(" ")" statement')
    def catch(self, p):
        return NS(p, T='Catch', expr=None, statement=p.statement)

    @_('FINALLY statement')
    def final(self, p):
        return p.statement

    @_('empty')
    def final(self, p):
        return None

    @_('IF "(" expr ")" statement %prec IFPREC')
    def statement_without_semicolon(self, p):
        return NS(p, T='If', condition=p.expr, then=p.statement, otherwise=None)

    @_('IF "(" expr ")" statement ELSE statement')
    def statement_without_semicolon(self, p):
        return NS(p, T='If', condition=p.expr, then=p.statement0, otherwise=p.statement1)

    @_('SWITCH "(" expr ")" "{" cases "}"')
    def statement_without_semicolon(self, p):
        return NS(p, T='Switch', value=p.expr, cases=p.cases)

    @_('case')
    def cases(self, p):
        return [ p.case ]

    @_('cases case')
    def cases(self, p):
        p.cases.append(p.case)
        return p.cases

    @_('CASE expr ":" block')
    def case(self, p):
        return NS(p, T='Case', value=p.expr, body=p.block)

    @_('DEFAULT ":" block')
    def case(self, p):
        return NS(p, T='Case', value=None, body=p.block)

    @_('FOR "(" loop_init expr ";" loop_statement ")" statement')
    def statement_without_semicolon(self, p):
        self.empty_statement_helper(p, p.loop_init)
        self.empty_statement_helper(p, p.loop_statement)
        return NS(p, T='For', init=p.loop_init, condition=p.expr, iteration=p.loop_statement, body=p.statement)

    @_('FOR "(" loop_init ";" loop_statement ")" statement')
    def statement_without_semicolon(self, p):
        self.empty_statement_helper(p, p.loop_init)
        self.empty_statement_helper(p, p.loop_statement)
        return NS(p, T='For', init=p.loop_init, condition=None, iteration=p.loop_statement, body=p.statement)

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
        return NS(p, T='While', condition=p.expr, body=p.statement)

    @_('DO statement WHILE "(" expr ")"')
    def statement_without_semicolon(self, p):
        return NS(p, T='DoWhile', condition=p.expr, body=p.statement)

    @_('CONTINUE')
    def statement_with_semicolon(self, p):
        return NS(p, T='Break', breaks=0, contin=True)

    @_('THROW expr "," expr')
    def statement_with_semicolon(self, p):
        return NS(p, T='Throw', type=p.expr0, code=p.expr1)

    @_('THROW expr')
    def statement_with_semicolon(self, p):
        return NS(p, T='Throw', type=p.expr, code=None)

    @_('break_list CONTINUE')
    def statement_with_semicolon(self, p):
        return NS(p, T='Break', breaks=p.break_list.count, contin=True, loc=p.break_list.loc, _loc_begin=p.break_list._loc_begin)

    @_('break_list')
    def statement_with_semicolon(self, p):
        return NS(p, T='Break', breaks=p.break_list.count, contin=False, loc=p.break_list.loc, _loc_begin=p.break_list._loc_begin)

    @_('BREAK')
    def break_list(self, p):
        return NS(p, T='_break_list', count=1)

    @_('break_list BREAK')
    def break_list(self, p):
        p.break_list.count += 1
        return p.break_list

    @_('NAME')
    def assignee(self, p):
        return NS(p, T='DirectAssignee', name=p.NAME)

    @_('expr "." NAME')
    def assignee(self, p):
        return NS(p, T='FieldAssignee', object=p.expr, name=p.NAME, loc=p.expr.loc, _loc_begin=p.expr.loc)

    @_('expr "[" expr "]"')
    def assignee(self, p):
        return NS(p, T='ItemAssignee', array=p.expr0, index=p.expr1, loc=p.expr0.loc, _loc_begin=p.expr0.loc)

    @_('assignee "=" expr')
    def statement_with_semicolon(self, p):
        return NS(p, T='Assign', assignee=p.assignee, value=p.expr)

    @_('assignee CMP_ASSIGN expr')
    def statement_with_semicolon(self, p):
        return NS(p, T='CompoundAssign', op=p.CMP_ASSIGN[0:-1], assignee=p.assignee, value=p.expr)

    @_('assignee PP')
    def statement_with_semicolon(self, p):
        return NS(p, T='IncDecAssign', op='++', assignee=p.assignee)

    @_('assignee MM')
    def statement_with_semicolon(self, p):
        return NS(p, T='IncDecAssign', op='--', assignee=p.assignee)

    @_('VAR typedef NAME')
    def statement_with_semicolon(self, p):
        return NS(p, T='Variable', name=p.NAME, type=p.typedef)

    @_('DELEGATE NAME "(" params ")" ";"')
    def module_statement(self, p):
        return NS(p, T='Delegate', name=p.NAME, returns=None, params=p.params)

    @_('DELEGATE typedef NAME "(" params ")" ";"')
    def module_statement(self, p):
        return NS(p, T='Delegate', name=p.NAME, returns=p.typedef, params=p.params)

    @_('"{" block "}"')
    def statement_without_semicolon(self, p):
        return NS(p, T='Block', body=p.block)

    @_('NEW typedef')
    def expr(self, p):
        return NS(p, T='New', type=p.typedef)

    @_('DELETE expr')
    def statement_with_semicolon(self, p):
        return NS(p, T='Delete', value=p.expr)

    @_('RETURN')
    def statement_with_semicolon(self, p):
        return NS(p, T='Return', value=None)

    @_('RETURN expr')
    def statement_with_semicolon(self, p):
        return NS(p, T='Return', value=p.expr)

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
        return [ ]

    @_('args_list')
    def args(self, p):
        return p.args_list

    @_('expr')
    def args_list(self, p):
        return [ p.expr ]

    @_('args_list "," expr')
    def args_list(self, p):
        p.args_list.append(p.expr)
        return p.args_list

    @_('expr "(" args ")"')
    def expr(self, p):
        return NS(p, T='Call', func=p.expr, args=p.args)

    @_('expr "[" expr "]"')
    def expr(self, p):
        return NS(p, T='GetItem', array=p.expr0, index=p.expr1)

    @_('expr "." NAME')
    def expr(self, p):
        return NS(p, T='GetField', value=p.expr, name=p.NAME)

    @_('empty')
    def statement_with_semicolon(self, p):
        return NS(p, T='Empty', loc=None, _loc_begin=None)

    @_('expr')
    def statement_with_semicolon(self, p):
        return NS(p, T='ExpressionStatement', expr=p.expr)

    @_('expr "?" expr ":" expr')
    def expr(self, p):
        return NS(p, T='Conditional', condition=p.expr0, then=p.expr1, otherwise=p.expr2)

    @_('expr "+" expr')
    def expr(self, p):
        return NS(p, T='AddOperator', left=p.expr0, right=p.expr1)

    @_('expr "-" expr')
    def expr(self, p):
        return NS(p, T='SubOperator', left=p.expr0, right=p.expr1)

    @_('expr "*" expr')
    def expr(self, p):
        return NS(p, T='MulOperator', left=p.expr0, right=p.expr1)

    @_('expr "/" expr')
    def expr(self, p):
        return NS(p, T='DivOperator', left=p.expr0, right=p.expr1)

    @_('expr "%" expr')
    def expr(self, p):
        return NS(p, T='ModOperator', left=p.expr0, right=p.expr1)

    @_('expr "<" expr')
    def expr(self, p):
        return NS(p, T='CompareOperator', op='<', left=p.expr0, right=p.expr1)

    @_('expr LE expr')
    def expr(self, p):
        return NS(p, T='CompareOperator', op='<=', left=p.expr0, right=p.expr1)

    @_('expr ">" expr')
    def expr(self, p):
        return NS(p, T='CompareOperator', op='>', left=p.expr0, right=p.expr1)

    @_('expr GE expr')
    def expr(self, p):
        return NS(p, T='CompareOperator', op='>=', left=p.expr0, right=p.expr1)

    @_('expr EQ expr')
    def expr(self, p):
        return NS(p, T='CompareOperator', op='==', left=p.expr0, right=p.expr1)

    @_('expr NE expr')
    def expr(self, p):
        return NS(p, T='CompareOperator', op='!=', left=p.expr0, right=p.expr1)

    @_('expr "&" expr')
    def expr(self, p):
        return NS(p, T='BitAndOperator', left=p.expr0, right=p.expr1)

    @_('expr "|" expr')
    def expr(self, p):
        return NS(p, T='BitOrOperator', left=p.expr0, right=p.expr1)

    @_('expr "^" expr')
    def expr(self, p):
        return NS(p, T='BitXorOperator', left=p.expr0, right=p.expr1)

    @_('expr AND expr')
    def expr(self, p):
        return NS(p, T='LogicAndOperator', left=p.expr0, right=p.expr1)

    @_('expr OR expr')
    def expr(self, p):
        return NS(p, T='LogicOrOperator', left=p.expr0, right=p.expr1)

    @_('expr SHR expr')
    def expr(self, p):
        return NS(p, T='ShiftRightOperator', left=p.expr0, right=p.expr1)

    @_('expr SHL expr')
    def expr(self, p):
        return NS(p, T='ShiftLeftOperator', left=p.expr0, right=p.expr1)

    @_('"-" expr %prec UMINUS')
    def expr(self, p):
        return NS(p, T='MinusOperator', value=p.expr)

    @_('"+" expr %prec UPLUS')
    def expr(self, p):
        return NS(p, T='PlusOperator', value=p.expr)

    @_('"!" expr %prec UPLUS')
    def expr(self, p):
        return NS(p, T='NotOperator', value=p.expr)

    @_('"~" expr %prec UPLUS')
    def expr(self, p):
        return NS(p, T='BitInversionOperator', value=p.expr)

    @_('"&" expr %prec UPLUS')
    def expr(self, p):
        return NS(p, T='ReferenceOperator', value=p.expr)

    @_('expr "@" typedef')
    def expr(self, p):
        return NS(p, T='TypeCast', value=p.expr, type=p.typedef)

    @_('"(" expr ")"')
    def expr(self, p):
        return p.expr

    @_('HEX_NUMBER')
    def expr(self, p):
        return NS(p, T='IntLiteral', base=16, value=p.HEX_NUMBER[2:])

    @_('OCT_NUMBER')
    def expr(self, p):
        return NS(p, T='IntLiteral', base=8, value=p.OCT_NUMBER[2:])

    @_('BIN_NUMBER')
    def expr(self, p):
        return NS(p, T='IntLiteral', base=2, value=p.BIN_NUMBER[2:])

    @_('DEC_NUMBER')
    def expr(self, p):
        return NS(p, T='IntLiteral', base=10, value=p.DEC_NUMBER)

    @_('INV_NUMBER')
    def expr(self, p):
        self.rep.error('Decimal number with zero prefix is not allowed.', p.index)
        return NS(p, T='IntLiteral', base=10, value='0')

    @_('FP_NUMBER')
    def expr(self, p):
        return NS(p, T='FloatLiteral', value=p.FP_NUMBER)

    @_('NAME')
    def expr(self, p):
        return NS(p, T='Identifier', name=p.NAME)

    escape_chars = {
        'n': '\n',
        't': '\t',
        'v': '\v',
        'b': '\b',
        'r': '\r',
        'f': '\f',
        'a': '\a',
        '\\': '\\',
        '?': '?',
        '\'': '\'',
        '"': '"',
        '0': '\0',
    }

    def unescape_string(self, s, loc):
        state = 'text'
        out = ''
        for c in s[1:-1]:
            loc += 1
            if state == 'text':
                if c == '\\':
                    state = 'escape'
                else:
                    out += c
            elif state == 'escape':
                c = c.lower()
                if c == 'x':
                    state = 'hex'
                    cnt = 2
                    value = 0
                elif c == 'u':
                    state = 'hex'
                    cnt = 4
                    value = 0
                elif c in UVMSParser.escape_chars:
                    out += UVMSParser.escape_chars[c]
                    state = 'text'
                else:
                    self.rep.error('Unexpected string escape sequence.', loc)
                    out += c
                    state = 'text'
            elif state == 'hex':
                c = c.lower()
                if c in '0123456789':
                    x = ord(c) - ord('0')
                elif c in 'abcdef':
                    x = ord(c) - ord('a') + 10
                elif c == 'u':
                    cnt += 2
                    continue
                else:
                    self.rep.error('Invalid hexidecimal sequence.', loc)
                    out += c
                    state = 'text'
                    continue
                value <<= 4
                value |= x
                cnt -= 1
                if cnt == 0:
                    out += chr(value)
                    state = 'text'
        if state != 'text':
            self.rep.error('Unexpected end of string.', loc)
        return out

    @_('STRING')
    def strings(self, p):
        return NS(p, T='StringLiteral', value=self.unescape_string(p.STRING, p.index))

    @_('strings STRING')
    def strings(self, p):
        p.strings.value += self.unescape_string(p.STRING, p.index)
        return p.strings

    @_('strings')
    def expr(self, p):
        return p.strings

    @_('CHAR')
    def expr(self, p):
        return NS(p, T='CharLiteral', value=self.unescape_string(p.CHAR, p.index))

    def error(self, p):
        self.rep.error(f'Syntax error. Unexpected token {p.type} `{p.value}`.', p.index)

import bisect
import re

class LocTransform:

    def __init__(self, text, file_name):
        self.total = len(text)
        self.starts = [ 0 ]
        self.virt_starts = [ 1 ]
        self.virt_info = [ (file_name, 1) ]
        start = 0
        while start < len(text):
            try:
                pos = text.index('\n', start) + 1
                line = text[start:pos]
            except ValueError:
                pos = len(text)
                line = text[start:]
            num = len(self.starts)
            self.starts.append(pos)
            start = pos
            m = re.match(r'^\s*#\s*(?:line)?\s+([0-9]+)(?:(?:\s+([^"][^\s]+))|(?:\s+"([^"]+)))?', line)
            if m is not None:
                self.virt_starts.append(num + 1)
                file_name = m.group(2) or m.group(3) or file_name
                self.virt_info.append((file_name, int(m.group(1))))

    def indexToLocInfo(self, index):
        index = max(0, min(self.total, index))
        line = bisect.bisect(self.starts, index)
        line_start = self.starts[max(0, min(len(self.starts) - 1, line - 1))]
        col = index - line_start
        index = bisect.bisect(self.virt_starts, line)
        index = max(0, min(len(self.virt_starts) - 1, index - 1))
        start = self.virt_starts[index]
        info = self.virt_info[index]
        return (info[0], line - start + info[1], col + 1)

    def transform(index):
        pass


text = '''a /* other
 comment */
# 90
import re;
#line 12 "some.c"
import utf8; // some comment
funtion x() {
    re.some();
}
'''

lexer = UVMSLexer()
parser = UVMSParser()
tokens = lexer.tokenize(text)
for t in tokens:
    print(t.value)
exit()
tree = parser.parse(tokens)
print(tree)


class Enc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, NS):
            return o.__dict__
        return None

print(json.dumps(tree, cls=Enc, indent='\t'))
