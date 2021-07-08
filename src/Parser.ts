import _ from 'lodash';

// TODO split lexer and parser into separate files

// @ and = for specifying program-wide attributes as key-value pairs
const SYMBOLS = ['(', ')', ',', '@', '='];

// only pass, repeat, times, command, and define currently interpreted
// but reserving various other keywords for future development
const KEYWORDS = ["define", "function",
    "set", "var", "let", "mutable", "to", "in",
    "if", "elif", "else", "end", "then",
    "repeat", "times", "pass",
    "choice", "match", "case", "of",
    "and", "or", "null", "true", "false",
    "command", "query"];

type Position = {
    line: number
    column: number
}

export class FileLocation {
    start: Position
    end: Position

    constructor(start = { line: 0, column: 0 }, end = { line: 0, column: 0 }) {
        this.start = start;
        this.end = end;
    }
}

enum WhitespaceType {
    Indent = 'indent',
    Dedent = 'dedent',
    Newline = 'newline',
}

enum TokenType {
    Whitespace = 'whitespace',
    Symbol = 'symbol',
    Keyword = 'keyword',
    Ident = 'ident',
    IntLiteral = 'int',
}

type Token = {
    kind: TokenType
    value: string | number | Ident // whitespace characters will have "" as their value
    location: FileLocation
    whitespace?: WhitespaceType
}

function token_equal(a: Token, b: Token) {
    // isEqual needed for the values because they can be objects
    return a.kind === b.kind && _.isEqual(a.value, b.value) && a.whitespace === b.whitespace;
}

function is_space(c: string) {
    return c !== undefined && c.length === 1 && (c === '\t' || c === '\r' || c === ' ')
}

function is_indent(c: string) {
    return c !== undefined && c.length === 1 && (c === '\t' || c === ' ')
}

function is_alpha(c: string) {
    return c !== undefined && /^[A-Z]$/i.test(c);
}

function is_digit(c: string) {
    return c !== undefined && /^[0-9]$/.test(c);
}

enum SyntaxErrorCode {
    UnexpectedEOF,
    InvalidCharacter,
    InvalidIndentation,
    UnexpectedToken,
    InvalidExpression,
    InvalidStatement,
}

export class SyntaxError extends Error {
    code: SyntaxErrorCode;
    location: FileLocation;

    constructor(code: SyntaxErrorCode, location: FileLocation, msg: string) {
        super(msg);
        // necessary according to https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, SyntaxError.prototype);
        this.code = code;
        this.location = location;

    }
}

export type Meta = {
    location: FileLocation
    // attributes: [string, string][] // array of (string, string) tuples
    // leaving attributes unimplemented for now
    // potentially useful for special modes where execution should differ in some way
};

export type Invocation = {
    name: string
    args: Expression[]
};

// have a separate Ident type to differentiate it from a keyword
export type Ident = {
    name: string
};

export enum ExpressionType {
    Number = "number",
    Ident = "ident"
};

export type Expression = {
    kind: ExpressionType,
    meta: Meta,
    expression: number | Ident,
};

export type Command = {
    invoke: Invocation
};

export type Execute = {
    invoke: Invocation
};

export type Repeat = {
    number: Expression
    body: Statement[]
};

export enum StatementType {
    Repeat = "repeat",
    Execute = "execute",
    Command = "command"
};

export type Statement = {
    kind: StatementType
    meta: Meta,
    stmt: Repeat | Execute | Command,
};

export type Procedure = {
    kind: string
    meta: Meta
    name: string
    params: string[]
    body: Statement[]
};

export type TopLevelStatement = Procedure | Statement;

export type Program = {
    body: TopLevelStatement[]
};

export class Lexer {
    source: string;
    position = 0;
    indent_stack: number[] = [0];
    next_line: number = 0;
    next_column: number = 0;

    constructor(program: string) {
        this.source = program;
    }

    error(code: SyntaxErrorCode, msg: string) {
        const pos = this.next_position();
        return new SyntaxError(code, { start: pos, end: pos }, msg);
    }

    token(tok: TokenType, value: string | number | Ident,
        start: Position, whitespace?: WhitespaceType): Token {
        let end = this.next_position();
        let loc = { start: start, end: end };
        let t: Token = { kind: tok, value: value, location: loc }
        if (tok === TokenType.Whitespace) {
            t.whitespace = whitespace;
        }
        return t;
    }

    last_indent() {
        return _.last(this.indent_stack);
    }

    next_position() {
        return {
            line: this.next_line,
            column: this.next_column
        }
    }

    advance() {
        if (this.position < this.source.length) {
            return this.source[this.position++];
        }
        return this.error(SyntaxErrorCode.UnexpectedEOF, "Unexpected end of file");
    }

    peek_char() {
        if (this.position < this.source.length) {
            return this.source[this.position];
        }
        return this.error(SyntaxErrorCode.UnexpectedEOF, "Unexpected end of file");
    }

    is_eof() {
        return this.position >= this.source.length;
    }

    next_char() {
        const c = this.advance();
        if (c instanceof SyntaxError) {
            return c;
        }
        switch (c) {
            case '\n':
                this.next_line += 1;
                this.next_column = 0;
                break;
            default:
                // could check for control characters here
                this.next_column += 1;
        }
        return c;
    }

    /// consumes characters while the predicate do_take_next is true
    /// returns the resulting string
    build_string(start: string, do_take_next: (c: string) => boolean) {
        let c = this.peek_char();
        while (!(c instanceof SyntaxError) && do_take_next(c)) {
            start += this.next_char();
            c = this.peek_char();
        }
        return start;
    }

    /// processes and returns next Token
    lex_token(): Token | SyntaxError {
        let start = this.next_position();
        const c = this.next_char();
        if (c instanceof SyntaxError) {
            return c;
        }
        // identifiers start with alphabetic character or underscore
        // primary motivation for allowing underscores is to be able to add them
        // to user-defined procedure names to avoid collisions with stdlib
        if (is_alpha(c) || c === '_') {
            // can contain alphabetic, digits, and underscores
            const string = this.build_string(c, (x: string) => is_alpha(x) || is_digit(x) || x === '_');
            if (KEYWORDS.includes(string)) {
                return this.token(TokenType.Keyword, string, start);
            }
            return this.token(TokenType.Ident, { name: string }, start);
        } else if (is_digit(c)) {
            const string = this.build_string(c, (x: string) => is_digit(x));
            return this.token(TokenType.IntLiteral, parseInt(string), start);
        } else if (SYMBOLS.includes(c)) {
            return this.token(TokenType.Symbol, c, start);
        }
        return this.error(SyntaxErrorCode.InvalidCharacter,
            `Invalid character '${c}'`)
    }

    /// skips any whitespace tokens, returning the number of indentation tokens skipped
    skip_whitespace() {
        let indent = 0;
        let c = this.peek_char();
        while (!(c instanceof SyntaxError) && is_space(c)) {
            if (is_indent(c)) { indent += 1; }
            this.next_char(); // consume whitespace character
            c = this.peek_char();

        }
        return indent;
    }

    /// advances past any comment and/or newline if it exists,
    /// returning true if the next char was a comment/newline/eof.
    skip_comment() {
        let next = this.peek_char();
        if (this.is_eof() || next === '#' || next === '\n') {
            while (!this.is_eof() && this.peek_char() !== '\n') {
                this.next_char();
            }
            // skip the newline
            if (!this.is_eof()) {
                this.next_char();
            }
            return true
        }
        return false;
    }

    /// process the next line of the source, append tokens to out
    lex_line(out: Token[]): void | SyntaxError {
        let start = this.next_position();
        let indent = this.skip_whitespace();

        // only emit any indent/dedent if there is at least one token on the line
        if (!this.skip_comment()) {
            if (indent > this.last_indent()!) {
                this.indent_stack.push(indent);
                out.push(this.token(TokenType.Whitespace, "",
                    start, WhitespaceType.Indent));
            } else {
                while (indent < this.last_indent()!) {
                    out.push(this.token(TokenType.Whitespace, "",
                        start, WhitespaceType.Dedent));
                    this.indent_stack.pop();
                }

                // make sure we popped to an existing dedent level and not some spot in between
                if (indent !== this.last_indent()) {
                    return this.error(SyntaxErrorCode.InvalidIndentation, "Invalid indentation level");
                }
            }

            // then lex all the tokens on the line until newline/comment
            while (!this.skip_comment()) {
                let t = this.lex_token();
                if (t instanceof SyntaxError) {
                    return t;
                }
                out.push(t);
                this.skip_whitespace();
            }
            // always emit a newline token, even if we hit EOF
            out.push(this.token(TokenType.Whitespace, "",
                start, WhitespaceType.Newline));
        }
    }

    lex_all(): Token[] | SyntaxError {
        const tokens: Token[] = [];
        while (!this.is_eof()) {
            const result = this.lex_line(tokens)
            if (result instanceof SyntaxError) {
                return result;
            }
        }
        for (let i = 1; i < this.indent_stack.length; i++) {
            tokens.push(this.token(TokenType.Whitespace, "",
                this.next_position(), WhitespaceType.Dedent));
        }
        return tokens;
    }
}

export class Parser {
    tokens: Token[]
    last_location: FileLocation

    constructor(tokens: Token[]) {
        this.tokens = _.reverse(tokens);
        this.last_location = new FileLocation();
    }

    error(code: SyntaxErrorCode, msg: string) {
        return new SyntaxError(code, this.last_location, msg);
    }

    make_check_token(tok: TokenType, value: string | number | Ident) {
        let t: Token = { kind: tok, value: value, location: new FileLocation() }
        return t;
    }

    make_ws_token(type: WhitespaceType) {
        return {
            kind: TokenType.Whitespace, value: "",
            location: new FileLocation(), whitespace: type
        };
    }

    next_location() {
        if (this.tokens.length > 0) {
            return _.last(this.tokens)!.location;
        }
        return new FileLocation();
    }

    next() {
        const t = this.tokens.pop();
        if (t !== undefined) {
            this.last_location = t.location;
            return t;
        }
        return this.error(SyntaxErrorCode.UnexpectedEOF, "Unexpected end of file");
    }

    match_token(expected: Token): SyntaxError | void {
        const token = this.next();
        if (token instanceof SyntaxError) {
            return token;
        }
        if (!token_equal(token, expected)) {
            return this.error(SyntaxErrorCode.UnexpectedToken,
                `Expected token ${JSON.stringify(expected)}, found ${token.kind}`);
        }
    }

    peek_token(expected: Token) {
        const last = _.last(this.tokens);
        return last !== undefined && token_equal(last, expected);
    }

    new_meta(start: FileLocation): Meta {
        const loc = new FileLocation(start.start, this.last_location.end);
        return { location: loc };
    }

    match_ident(): string | SyntaxError {
        const token = this.next();
        if (token instanceof SyntaxError) {
            return token;
        }
        if (token.kind === TokenType.Ident) {
            return (token.value as Ident).name;
        }
        return this.error(SyntaxErrorCode.UnexpectedToken,
            `Expected identifier, found ${token.kind}`);
    }

    match_expression(): Expression | SyntaxError {
        const start = this.next_location();
        const token = this.next();
        if (token instanceof SyntaxError) {
            return token;
        }
        let expr_type: ExpressionType;
        let expr: number | Ident;
        switch (token.kind) {
            case TokenType.IntLiteral:
                expr = token.value as number;
                expr_type = ExpressionType.Number;
                break;
            case TokenType.Ident:
                expr = token.value as Ident;
                expr_type = ExpressionType.Ident;
                break;
            default:
                return this.error(SyntaxErrorCode.InvalidExpression,
                    "Expected an expression which must start with an identifier or a literal");
        }
        return { kind: expr_type, meta: this.new_meta(start), expression: expr }
    }

    match_paren_list<T>(matchfn: () => T | SyntaxError): T[] | SyntaxError {
        let sep = this.match_token(this.make_check_token(TokenType.Symbol, '('));
        if (sep instanceof SyntaxError) {
            return sep;
        }
        let entries: T[] = [];
        while (!this.peek_token(this.make_check_token(TokenType.Symbol, ')'))) {
            let match = matchfn();
            if (match instanceof SyntaxError) {
                return match;
            }
            entries.push(match);
            if (!this.peek_token(this.make_check_token(TokenType.Symbol, ','))) {
                break;
            }
            sep = this.match_token(this.make_check_token(TokenType.Symbol, ','));
            if (sep instanceof SyntaxError) {
                return sep;
            }
        }
        sep = this.match_token(this.make_check_token(TokenType.Symbol, ')'));
        if (sep instanceof SyntaxError) {
            return sep;
        }
        return entries;
    }

    match_invocation(name?: string): Invocation | SyntaxError {
        if (name === undefined) {
            const match = this.match_ident();
            if (match instanceof SyntaxError) {
                return match;
            }
            name = match;
        }
        const args = this.match_paren_list(this.match_expression.bind(this));
        if (args instanceof SyntaxError) {
            return args;
        }

        // language doesn't allow anything after a function call, so a newline must be here
        const match = this.match_token(this.make_ws_token(WhitespaceType.Newline));
        if (match instanceof SyntaxError) {
            return match;
        }

        return { name: name, args: args };
    }

    // TODO match_attributes

    match_statement(): Statement | null | SyntaxError {
        const start = this.next_location();
        const next = this.next();
        if (next instanceof SyntaxError) {
            return next;
        }
        const meta = this.new_meta(start);
        switch (next.kind) {
            case TokenType.Keyword:
                switch (next.value) {
                    case "pass":
                        // pass must be immediately followed by a newline
                        const match = this.match_token(this.make_ws_token(WhitespaceType.Newline));
                        if (match instanceof SyntaxError) {
                            return match;
                        }
                        return null;
                    case "repeat": // statement is a repeat
                        const repeat = this.match_repeat();
                        if (repeat instanceof SyntaxError) {
                            return repeat;
                        }
                        return { kind: StatementType.Repeat, meta: meta, stmt: repeat };
                    case "command": // statement is calling built-in command
                        const invoke = this.match_invocation();
                        if (invoke instanceof SyntaxError) {
                            return invoke;
                        }
                        return { kind: StatementType.Command, meta: meta, stmt: { invoke: invoke } }
                    default:
                        return this.error(SyntaxErrorCode.InvalidStatement, `Keyword ${next.value} not recognized`);
                }
            case TokenType.Ident: // statement is calling a user-defined function (Execute)
                const invoke = this.match_invocation((next.value as Ident).name);
                if (invoke instanceof SyntaxError) {
                    return invoke;
                }
                return { kind: StatementType.Execute, meta: meta, stmt: { invoke: invoke } }
            default:
                return this.error(SyntaxErrorCode.InvalidStatement, "Expected a statement, which must start with if, repeat, command, or an identifier");
        }
    }

    match_block(): Statement[] | SyntaxError {
        // must start with a new line and an indent
        let match = this.match_token(this.make_ws_token(WhitespaceType.Newline));
        if (match instanceof SyntaxError) {
            return match;
        }
        match = this.match_token(this.make_ws_token(WhitespaceType.Indent));
        if (match instanceof SyntaxError) {
            return match;
        }

        const body: Statement[] = [];
        while (!this.peek_token(this.make_ws_token(WhitespaceType.Dedent))) {
            let stmt = this.match_statement();
            if (stmt instanceof SyntaxError) {
                return stmt;
            }
            if (stmt === null) {
                break;
            }
            body.push(stmt);
        }

        // read the dedent
        const dedent = this.next();
        if (dedent instanceof SyntaxError) {
            return dedent;
        }
        return body;
    }

    match_repeat(): Repeat | SyntaxError {
        const number = this.match_expression();
        if (number instanceof SyntaxError) {
            return number;
        }
        const token = this.match_token(this.make_check_token(TokenType.Keyword, "times"));
        if (token instanceof SyntaxError) {
            return token;
        }
        const body = this.match_block();
        if (body instanceof SyntaxError) {
            return body;
        }
        return { number: number, body: body };
    }

    match_procedure(): Procedure | SyntaxError {
        const start = this.next_location();
        const def = this.match_token(this.make_check_token(TokenType.Keyword, "define"));
        if (def instanceof SyntaxError) {
            return def;
        }
        const name = this.match_ident();
        if (name instanceof SyntaxError) {
            return name;
        }
        const params = this.match_paren_list(this.match_ident.bind(this));
        if (params instanceof SyntaxError) {
            return params;
        }
        const body = this.match_block();
        if (body instanceof SyntaxError) {
            return body;
        }
        return {
            kind: "procedure",
            meta: this.new_meta(start),
            name: name,
            params: params,
            body: body
        }
    }

    match_top_level_statement(): TopLevelStatement | SyntaxError | null {
        if (this.peek_token(this.make_check_token(TokenType.Keyword, "define"))) {
            return this.match_procedure();
        } else {
            const stmt = this.match_statement();
            if (stmt instanceof SyntaxError) {
                if (stmt.code === SyntaxErrorCode.InvalidStatement) {
                    // overwrite the statement message with a better one for top-level statements
                    return new SyntaxError(stmt.code, stmt.location, "Expected a top-level statement, which must start with define, if, repeat, command, or an identifier");
                } else {
                    return stmt;
                }
            }
            return stmt;
        }
    }

    match_program(): Program | SyntaxError {
        const body: TopLevelStatement[] = [];
        while (this.tokens.length > 0) {
            let stmt = this.match_top_level_statement();
            if (stmt instanceof SyntaxError) {
                return stmt;
            }
            if (stmt !== null) {
                body.push(stmt);
            }
        }
        return { body: body };
    }
}

export default function parse(program: string): Program | SyntaxError {
    const lexer = new Lexer(program);
    const tokens = lexer.lex_all();
    if (tokens instanceof SyntaxError) {
        console.error(`[SyntaxError] ${tokens}`);
        return tokens;
    }
    const parser = new Parser(tokens);
    return parser.match_program();
}
