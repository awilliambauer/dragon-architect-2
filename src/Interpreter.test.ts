import { Lexer, SyntaxError, parse } from './Interpreter';

test("lexer-empty", () => {
    let lexer = new Lexer(``);
    expect(lexer.lex_all() instanceof SyntaxError).toBe(false);
});

test("lexer-basic-error", () => {
    let lexer = new Lexer(`a+5`);
    expect(lexer.lex_all() instanceof SyntaxError).toBe(true);
})

test("lexer-basic", () => {
    let lexer = new Lexer(`
define x()
    pass
x()
`);
    expect(lexer.lex_all() instanceof SyntaxError).toBe(false);
});

test("lexer-command", () => {
    let lexer = new Lexer(`
command x()
command y(2,3,4)
`);
    expect(lexer.lex_all() instanceof SyntaxError).toBe(false);
});

test("lexer-multiline-block", () => {
    let lexer = new Lexer(`
repeat 3 times
    command y(2,3,4)
    command x()
    repeat 8 times
        command z(2)
    command w(1,2)
`);
    expect(lexer.lex_all() instanceof SyntaxError).toBe(false);
});

test("lexer-comment", () => {
    let lexer = new Lexer(`
        # comment
command x()     # happy
command y(2,3,4)
# more command with no newline    `);
    expect(lexer.lex_all() instanceof SyntaxError).toBe(false);
});

test("parse-empty", () => {
    let result = parse(``);
    // console.log(JSON.stringify(result, null, 2));
        expect(result instanceof SyntaxError).toBe(false);
});

test("parse-basic-error", () => {
    let result = parse(`x`);
    // console.log(JSON.stringify(result, null, 2));
        expect(result instanceof SyntaxError).toBe(true);
})

test("parse-basic", () => {
    let result = parse(`
define x()
    pass
x()
`);
    // console.log(JSON.stringify(result, null, 2));
    expect(result instanceof SyntaxError).toBe(false);
});

test("parse-command", () => {
    let result = parse(`
command x()
command y(2,3,4)
`);
    // console.log(JSON.stringify(result, null, 2));
    expect(result instanceof SyntaxError).toBe(false);
});

test("parse-multiline-block", () => {
    let result = parse(`
repeat 3 times
    command y(2,3,4)
    command x()
    repeat 8 times
        command z(2)
    command w(1,2)
`);
    // console.log(JSON.stringify(result, null, 2));
    expect(result instanceof SyntaxError).toBe(false);
});

test("parse-comment", () => {
    let result = parse(`
        # comment
command x()     # happy
command y(2,3,4)
# more command with no newline    `);
    // console.log(JSON.stringify(result, null, 2));
    expect(result instanceof SyntaxError).toBe(false);
});