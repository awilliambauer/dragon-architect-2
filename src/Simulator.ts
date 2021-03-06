/* FILENAME:    Simulator.ts
 * DESCRIPTION: 
 *      This file contains different kinds of simulators that help simulate the animations
 * DATE:    08/19/2021
 * AUTHOR:      Aaron Bauer    Teagan Johnson    Katrina Li
 */
import _ from 'lodash';
import parse, {
    Procedure, FileLocation, Expression,
    ExpressionType, Invocation, Meta, Ident, Program,
    SyntaxError, Statement, StatementType, Repeat, Execute, Command
} from './Parser';
import WorldState from './WorldState';
import { StdLibText } from './StdLib';

export enum ValueType {
    Number = "number"
};

// currently only number Values are implemented, but using a structure
// that will make this easy to expand
export type Value = {
    kind: ValueType
    val: number
};

class Environment {
    values: Map<string, Value>;
    procedures: Map<string, Procedure>;

    constructor() {
        this.values = new Map<string, Value>();
        this.procedures = new Map<string, Procedure>();
    }
}

export type SimCommand = {
    meta: Meta
    name: string
    args: Value[]
};

export enum RuntimeErrorCode {
    CustomError,
    UnknownIdentifier,
    ArityMismatch,
    ArgumentError,
    ValueError
};

export class RuntimeError extends Error {
    code: RuntimeErrorCode;
    location: FileLocation;

    constructor(code: RuntimeErrorCode, location: FileLocation, msg: string) {
        super(msg);
        // necessary according to https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, RuntimeError.prototype);
        this.code = code;
        this.location = location;
    }
}

export function runtime_error(code: RuntimeErrorCode, msg: string, meta?: Meta) {
    console.error(msg);
    return new RuntimeError(code, meta ? meta.location : new FileLocation(), msg);
}

function evaluate(env: Environment, expr: Expression): Value | RuntimeError {
    switch (expr.kind) {
        case ExpressionType.Number:
            return { kind: ValueType.Number, val: expr.expression as number }
        case ExpressionType.Ident:
            // look up the identifier name in the environment
            // if it exists, return the corresponding value
            // otherwise, return an unknown identfier error
            const name = (expr.expression as Ident).name
            if (env.values.has(name)) {
                return _.clone(env.values.get(name)!);
            }
            return runtime_error(RuntimeErrorCode.UnknownIdentifier,
                `Unknown identifier ${name}`, expr.meta);
    }
}

function value_as_int(v: Value): number | RuntimeError {
    if (v.kind === ValueType.Number) {
        return v.val as number;
    }
    return runtime_error(RuntimeErrorCode.ValueError,
        `Could not convert ${JSON.stringify(v)} to int`);
}

function evaluate_repeat_header(env: Environment, number: Expression, meta: Meta): number | RuntimeError {
    const repeat_eval = evaluate(env, number);
    if (repeat_eval instanceof RuntimeError) {
        return repeat_eval;
    }
    const repeat_count = value_as_int(repeat_eval);
    if (repeat_count instanceof RuntimeError) {
        return repeat_count;
    }

    if (repeat_count < 0) {
        return runtime_error(RuntimeErrorCode.ArgumentError,
            `Repeat with negative number of iterations: ${repeat_count}`, meta)
    }
    return repeat_count;
}

function evaluate_arg_list(env: Environment, invo: Invocation): Value[] | RuntimeError {
    const vals: Value[] = [];
    for (let arg of invo.args) {
        const x = evaluate(env, arg);
        if (x instanceof RuntimeError) {
            return x;
        }
        vals.push(x);
    }
    return vals;
}

function lookup_procedure(env: Environment, invo: Invocation, meta: Meta): Procedure | RuntimeError {
    if (env.procedures.has(invo.name)) {
        return _.clone(env.procedures.get(invo.name)!);
    }
    return runtime_error(RuntimeErrorCode.UnknownIdentifier,
        `Unknown procedure ${invo.name}`, meta);
}

function create_env_for_procedure(env: Environment, procedure: Procedure,
    invo: Invocation, meta: Meta): Environment | RuntimeError {
    const vals = evaluate_arg_list(env, invo);
    if (vals instanceof RuntimeError) {
        return vals;
    }

    // check that the number of arguments matches the number of parameters
    const arity = vals.length;  // arity means the number of arguments
    if (arity !== procedure.params.length) {
        return runtime_error(RuntimeErrorCode.ArityMismatch,
            `Procedure ${invo.name} expects ${procedure.params.length} arguments, received ${arity}`);
    }

    // update the environment with the local variables
    const new_env = _.cloneDeep(env);
    for (let [name, value] of _.zip(procedure.params, vals)) {
        new_env.values.set(name!, value!);  // we know these won't be undefined because arity matches
    }
    return new_env;
}

export enum SimulatorState {
    Running = "running",
    Stopped = "stopped",
    Paused = "paused",
    Finished = "finished"
}

/// take a repeat statement and a count and return a new repeat statment with one lower count
function decrement_repeat(stmt: Statement, count: number): Statement {
    let repeat = stmt.stmt as Repeat;
    return {
        kind: StatementType.Repeat,
        meta: stmt.meta,
        stmt: {
            number: {
                kind: ExpressionType.Number,
                meta: repeat.number.meta,
                expression: count - 1
            },
            body: repeat.body
        }
    }
}

/// A Kobold simulator for simulating one command at a time
/// Useful for animating program execution and generating sequence of world states
export class IncrementalSimulator {
    world: WorldState
    base_env: Environment

    sim_state: SimulatorState
    execution_stack: [Statement, Environment][]  // stack of statements to be executed

    TICKS_PER_SECOND = 60;
    ticks_per_command = 30;  // controlled by speed slider
    last_stmt_exec_time = 0;
    total_steps = 0;

    constructor(world: WorldState, program: Program) {
        this.world = world;
        this.sim_state = SimulatorState.Stopped;
        this.execution_stack = [];
        this.base_env = _.cloneDeep(baseline_environment!);

        // go through program and process procedure definitions
        // push statements onto the execution stack---program.body is reversed so they end up in the correct order
        for (let s of program.body.slice().reverse()) {
            switch (s.kind) {
                case "procedure":
                    this.base_env.procedures.set(s.name, _.cloneDeep(s))
                    break;

                default:
                    this.execution_stack.push([s as Statement, this.base_env]);
            }
        }
    }

    is_running(): boolean {
        return this.sim_state === SimulatorState.Running;
    }

    set_running() {
        this.sim_state = SimulatorState.Running;
    }

    is_finished(): boolean {
        return this.sim_state === SimulatorState.Finished;
    }

    set_finished() {
        this.sim_state = SimulatorState.Finished;
    }

    is_stopped(): boolean {
        return this.sim_state === SimulatorState.Stopped;
    }

    set_stopped() {
        this.sim_state = SimulatorState.Stopped;
    }

    execute_to_command(): void | RuntimeError {
        // an empty execution_stack indicates there's nothing left to run, so mark as finished
        if (this.execution_stack.length === 0) {
            this.set_finished();
            return;
        }

        // don't execute unless the simulator is running
        if (!this.is_running()) {
            // this could be an error
            return;
        }

        const [stmt, env] = this.execution_stack.pop()!;
        switch (stmt.kind) {
            case StatementType.Repeat:
                let repeat = stmt.stmt as Repeat;
                let repeat_count = evaluate_repeat_header(env, repeat.number, stmt.meta);
                if (repeat_count instanceof RuntimeError) {
                    return repeat_count;
                }
                // repeat is not a command
                // so what we do is push a new repeat with one less count (if count > 1)
                // then push the body of the repeat so it gets executed next
                // finally return a recursive call (i.e., continue executing since we haven't hit a command)
                if (repeat_count > 1) {
                    this.execution_stack.push([decrement_repeat(stmt, repeat_count), env]);
                }
                for (let s of repeat.body.slice().reverse()) {
                    this.execution_stack.push([s, env]);
                }
                return this.execute_to_command();

            case StatementType.Execute:
                let exec = stmt.stmt as Execute;
                let procedure = lookup_procedure(env, exec.invoke, stmt.meta);
                if (procedure instanceof RuntimeError) {
                    return procedure;
                }
                let new_env = create_env_for_procedure(env, procedure, exec.invoke, stmt.meta);
                if (new_env instanceof RuntimeError) {
                    return new_env;
                }
                // push body of procedure onto the stack with new environment
                for (let s of procedure.body.slice().reverse()) {
                    this.execution_stack.push([s, new_env]);
                }
                // continue executing recursively
                return this.execute_to_command();

            case StatementType.Command:
                let command = stmt.stmt as Command;
                let args = evaluate_arg_list(env, command.invoke);
                if (args instanceof RuntimeError) {
                    return args;
                }
                // we've reached a command (base case), execute it using the WorldState
                let result = this.world.execute({
                    name: command.invoke.name,
                    args: args,
                    meta: stmt.meta
                });
                if (result instanceof RuntimeError) {
                    return result;
                }
                break;
        }
    }
}

/// A Kobold simulator for running a program straight through to the end
/// mostly useful for testing parsing and other language infrastructure
export class RecursiveSimulator {
    world: WorldState

    constructor(world: WorldState) {
        this.world = world;
    }

    execute_to_end(env: Environment, stmt: Statement): void | RuntimeError {
        switch (stmt.kind) {
            case StatementType.Repeat:
                let repeat = stmt.stmt as Repeat;
                let repeat_count = evaluate_repeat_header(env, repeat.number, stmt.meta);
                if (repeat_count instanceof RuntimeError) {
                    return repeat_count;
                }
                for (let i = 0; i < repeat_count; i++) {
                    let block_result = this.execute_block_to_end(env, repeat.body);
                    if (block_result instanceof RuntimeError) {
                        return block_result;
                    }
                }
                break;

            case StatementType.Execute:
                let exec = stmt.stmt as Execute;
                let procedure = lookup_procedure(env, exec.invoke, stmt.meta);
                if (procedure instanceof RuntimeError) {
                    return procedure;
                }
                let new_env = create_env_for_procedure(env, procedure, exec.invoke, stmt.meta);
                if (new_env instanceof RuntimeError) {
                    return new_env;
                }
                let block_result = this.execute_block_to_end(new_env, procedure.body);
                if (block_result instanceof RuntimeError) {
                    return block_result;
                }
                break;

            case StatementType.Command:
                let command = stmt.stmt as Command;
                let args = evaluate_arg_list(env, command.invoke);
                if (args instanceof RuntimeError) {
                    return args;
                }
                let result = this.world.execute({
                    name: command.invoke.name,
                    args: args,
                    meta: stmt.meta
                });
                if (result instanceof RuntimeError) {
                    return result;
                }
                break;
        }
    }

    execute_block_to_end(env: Environment, block: Statement[]): void | RuntimeError {
        for (let s of block) {
            let result = this.execute_to_end(env, s);
            if (result instanceof RuntimeError) {
                return result;
            }
        }
    }

    run_program_to_end(base_environment: Environment, program: Program): void | RuntimeError {
        let env = _.cloneDeep(base_environment);
        for (let s of program.body) {
            switch (s.kind) {
                case "procedure":
                    env.procedures.set(s.name, _.cloneDeep(s))
                    break;

                default:
                    let result = this.execute_to_end(env, s as Statement);
                    if (result instanceof RuntimeError) {
                        return result;
                    }
            }
        }
    }
}

/// run program to the end using a RecursiveSimulator, applying any commands to world
export default function run(world: WorldState, program: Program): void | RuntimeError {
    if (baseline_environment) {
        let sim = new RecursiveSimulator(world);
        let result = sim.run_program_to_end(baseline_environment, program);
        if (result instanceof RuntimeError) {
            console.error(`[RuntimeError] ${result}`);
            return result;
        }
    } else {
        console.error("run called before stdlib is loaded");
        return runtime_error(RuntimeErrorCode.CustomError, "run called before stdlib is loaded");
    }
}

export let baseline_environment: Environment | null = null;

function extract_definitions(program: Program): Environment {
    let env = new Environment();
    for (let stmt of program.body) {
        if (stmt.kind === "procedure") {
            let p = stmt as Procedure;
            env.procedures.set(p.name, _.cloneDeep(p));
        }
    }
    return env;
}

export function load_stdlib() {
    let ast = parse(StdLibText);
    if (ast instanceof SyntaxError) {
        console.error(`Error parsing stdlib: ${JSON.stringify(ast)}`);
        return;
    }
    let env = extract_definitions(ast);
    if (env instanceof RuntimeError) {
        console.error(`Error loading stdlib: ${JSON.stringify(env)}`);
        return;
    }
    baseline_environment = env;
}