import _ from "lodash"
import * as THREE from "three"
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
    // only care about dragon position, not direction
    if (!end.dragon_pos.equals(start.dragon_pos)) {
        goals.push({
            kind: GoalInfoType.DragonPos,
            position: end.dragon_pos
        });
    }

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

    return goals;
}

export default class PuzzleState {
    start_code: string = ""
    start_world: WorldState = new WorldState()
    goals: GoalInfo[] = []
    instructions: string = ""

    static make_from_file(filename: string) {
        return new Promise<PuzzleState>(resolve => {
            let state = new PuzzleState();
            fetch(filename)
                .then(response => response.json())
                .then((data: PuzzleSpec) => {
                    state.start_world = make_world_from_spec(data.world);

                    // TODO: library and instructions
                    // TODO: puzzle names/ids will matter once puzzle packs/unlocks are a thing

                    // read in starting program from file
                    if (data.program) {
                        fetch(data.program)
                            .then(response => response.text())
                            .then(text => state.start_code = text)
                            .catch(error => {
                                console.error(`Encountered error loading program from ${data.program}, as specified in ${filename}:`, error);
                            })
                    }

                    if (data.goal === GoalType.Solution) {
                        // these goals depend on the world state after a solution is run, so read in solution from file
                        if (data.solution) {
                            fetch(data.solution)
                                .then(response => response.text())
                                .then(text => {
                                    let program = parse(text);  // parse solution
                                    if (program instanceof SyntaxError) {
                                        console.error(`Syntax error when parsing solution ${text} from ${filename}:`, program);
                                    } else {
                                        // run solution and use the differences from starting state to generate goals
                                        let world = make_world_from_spec(data.world);
                                        run(world, program);
                                        state.goals = make_goals_from_world(world, state.start_world);
                                    }
                                })
                                .catch(error => {
                                    console.error(`Encountered error loading solution from ${data.solution}, as specified in ${filename}:`, error);
                                })
                        } else {
                            console.error(`Puzzle specification ${filename} has goal type ${data.goal}, but does not provide solution file`);
                        }
                        // otherwise we have a single goal, either MinCube or RunOnly
                    } else if (data.goal === GoalType.MinCube) {
                        state.goals = [{
                            kind: GoalInfoType.MinCube,
                            value: data.goalValue
                        }];
                    } else if (data.goal === GoalType.RunOnly) {
                        state.goals = [{
                            kind: GoalInfoType.RunOnly
                        }];
                    } else {
                        console.error(`Unrecognized goal type ${data.goal} in ${filename}`);
                    }
                    resolve(state);
                });
        });
    }
}