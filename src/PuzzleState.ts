import _ from "lodash"
import * as THREE from "three"
import { GameState } from "./App"
import parse, { SyntaxError } from "./Parser"
import run from "./Simulator"
import { mapHasVector3 } from "./Util"
import WorldState from "./WorldState"

export enum GoalInfoType {
    DragonPos = "position",  // goals only care about dragon position, not direction
    AddCube = "addcube",
    RemoveCube = "removecube",
    RunOnly = "runonly",
    MinCube = "mincube"
}

export type GoalInfo = {
    kind: GoalInfoType
    position?: THREE.Vector3  // only present for DragonPos and add/remove Cube kinds
    value?: number            // only present for MinCube kind
}

// available code blocks, strings must be keys in BlocklyComp.COMMANDS
// restricted: these blocks should not appear in the toolbox
// required: these blocks must appear in the toolbox
// granted: these blocks become available in the sandbox after completing this puzzle
type LibrarySpec = {
    restricted: string[]
    required: string[]
    granted: string[]
}

// starting cubes
type CubeSpec = {
    pos: number[]
    color: number
}

// starting world state
type WorldSpec = {
    pos: number[]
    dir: number[]
    cubes?: CubeSpec[]  // undefined indicates no starting cubes
}

enum GoalType {
    Solution = "solution",  // dragon moves, cubes added/removed based on a solution program
    RunOnly = "run_only",
    MinCube = "min_cube"
}

type PuzzleSpec = {
    name: string
    library: LibrarySpec
    world: WorldSpec
    program?: string      // file containing starting program; undefined indicates no starting code
    solution?: string     // file containing solution program; undefined for run-only and min cubes goal types
    goal: GoalType
    goalValue?: number    // number of cubes for a min cube goal
    instructions: string
}

function make_world_from_spec(spec: WorldSpec): WorldState {
    let world = new WorldState();
    world.dragon_pos = new THREE.Vector3(...spec.pos);
    world.dragon_dir = new THREE.Vector3(...spec.dir);
    if (spec.cubes) {
        for (let { pos, color } of spec.cubes) {
            world.cube_map.set(new THREE.Vector3(...pos), color);
        }
    }
    world.dirty = true;
    return world;
}

function make_goals_from_world(end: WorldState, start: WorldState): GoalInfo[] {
    let goals = []

    // check for cubes added, position only
    for (let [cubePos, _cubeColor] of end.cube_map) {
        if (!mapHasVector3(start.cube_map, cubePos)) {
            goals.push({
                kind: GoalInfoType.AddCube,
                position: cubePos
            });
        }
    }

    // check for cubes removed, position only
    for (let [cubePos, _cubeColor] of start.cube_map) {
        if (!mapHasVector3(end.cube_map, cubePos)) {
            goals.push({
                kind: GoalInfoType.RemoveCube,
                position: cubePos
            });
        }
    }

    // only have a position goal if there are no cube goals
    if (goals.length === 0) {
        // only care about dragon position, not direction
        if (!end.dragon_pos.equals(start.dragon_pos)) {
            goals.push({
                kind: GoalInfoType.DragonPos,
                position: end.dragon_pos
            });
        }
    }

    return goals;
}

export default class PuzzleState {
    start_code: string = ""
    start_world: WorldState = new WorldState()
    goals: GoalInfo[] = []
    instructions: string = ""
    library: LibrarySpec = {
        restricted: [],
        required: [],
        granted: []
    }
    name: string = ""
    win_callback: () => void = () => {}

    check_completed(gamestate: GameState) {
        if (this.is_complete(gamestate)) {
            this.win_callback();
        }
    }

    is_complete(gamestate: GameState): boolean {
        // return true if the current game state matches the goals
        /* criteria
            simulator must be finished
            loop over goals
                switch on goal.kind
                    RunOnly: true
                    MinCube: check gamestate.world.cube_map for correct number of cubes
                    AddCube: check that this cube exists
                    RemoveCube: check that this cube does not exist
                    DragonPos: check dragon's position
        */
        if (!gamestate.simulator.is_finished()) {
            return false;
        }

        let posRequired;
        for (let goal of this.goals) {
            //console.log("goal.kind: " + goal.kind);
            switch (goal.kind) {
                case GoalInfoType.RunOnly:
                    return true;
                case GoalInfoType.MinCube:
                    let minRequired = goal.value as number;
                    let cubeNum = gamestate.world.cube_map.size;
                    return (minRequired <= cubeNum);

                case GoalInfoType.AddCube:
                    posRequired = goal.position as THREE.Vector3;
                    return mapHasVector3(gamestate.world.cube_map, posRequired);
                case GoalInfoType.RemoveCube:
                    posRequired = goal.position as THREE.Vector3;
                    return !mapHasVector3(gamestate.world.cube_map, posRequired);

                case GoalInfoType.DragonPos:
                    let dragonPosRequired = goal.position as THREE.Vector3;
                    return gamestate.world.dragon_pos.equals(dragonPosRequired);

            }
        }
        return false;
    }

    static make_from_file(filename: string, win_callback: () => void) {
        let state = new PuzzleState();
        state.win_callback = win_callback;

        /// read in starting program from file
        let fetchProgram = (data: PuzzleSpec) => {
            return new Promise<PuzzleSpec>((resolve, reject) => {
                if (data.program) {
                    fetch(data.program)
                        .then(response => response.text())
                        .then(text => {
                            state.start_code = text;
                            resolve(data)
                        })
                        .catch(error => {
                            reject(`Encountered error loading program from ${data.program}, as specified in ${filename}: ${error}`);
                        });
                } else {
                    resolve(data);
                }
            });
        }

        /// set up the puzzle's solution, potentially reading it from a file
        let fetchSolution = (data: PuzzleSpec) => {
            return new Promise<PuzzleSpec>((resolve, reject) => {
                if (data.goal === GoalType.Solution) {
                    // these goals depend on the world state after a solution is run, so read in solution from file
                    if (data.solution) {
                        fetch(data.solution)
                            .then(response => response.text())
                            .then(text => {
                                let program = parse(text);  // parse solution
                                if (program instanceof SyntaxError) {
                                    reject(`Syntax error when parsing solution ${text} from ${filename}: ${program}`);
                                } else {
                                    // run solution and use the differences from starting state to generate goals
                                    let world = make_world_from_spec(data.world);
                                    run(world, program);
                                    state.goals = make_goals_from_world(world, state.start_world);
                                    resolve(data);
                                }
                            })
                            .catch(error => {
                                reject(`Encountered error loading solution from ${data.solution}, as specified in ${filename}: ${error}`);
                            })
                    } else {
                        reject(`Puzzle specification ${filename} has goal type ${data.goal}, but does not provide solution file`);
                    }
                    // otherwise we have a single goal, either MinCube or RunOnly
                } else if (data.goal === GoalType.MinCube) {
                    state.goals = [{
                        kind: GoalInfoType.MinCube,
                        value: data.goalValue
                    }];
                    resolve(data);
                } else if (data.goal === GoalType.RunOnly) {
                    state.goals = [{
                        kind: GoalInfoType.RunOnly
                    }];
                    resolve(data);
                } else {
                    reject(`Unrecognized goal type ${data.goal} in ${filename}`);
                }
            });
        }

        return new Promise<PuzzleState>(resolve => {
            // TODO: library and instructions
            // TODO: puzzle names/ids will matter once puzzle packs/unlocks are a thing                   
            fetch(filename)
                .then(response => { return response.json() })
                .then((data: PuzzleSpec) => {
                    state.start_world = make_world_from_spec(data.world);
                    state.library = data.library;
                    state.name = data.name;
                    return data;
                })
                .then(fetchProgram)
                .then(fetchSolution)
                .then(() => {
                    resolve(state);
                })
                .catch(error => console.error(error));
        });
    }
}

export let SANDBOX_STATE = new PuzzleState();