import React from 'react';
import * as THREE from 'three';
import BlocklyComp, { blocks_to_text, text_to_blocks } from './BlocklyComp';
import Display from './Display';
import WorldState from './WorldState';
import run, { load_stdlib, IncrementalSimulator, SimulatorState } from './Simulator';
import parse, { EMPTY_PROGRAM, Program, SyntaxError } from './Parser';
import PuzzleState, { SANDBOX_STATE } from './PuzzleState';
import { Run } from './RunButton';
import _ from 'lodash';
import Slider from './Slider';
import { TEXT_CHANGECASE_TOOLTIP } from 'blockly/msg/en';
import PuzzleManager from './PuzzleManager';
// import * as GOAL from "../public/puzzles/test.json"

export type GameState = {
  program: Program
  world: WorldState
  puzzle?: PuzzleState
  simulator: IncrementalSimulator
  reset: boolean
  lastSavedWorld: WorldState | undefined
  //loading: boolean
  view: ViewType
}

export enum ViewType {
  Loading = "loading",
  Normal = "normal",
  PuzzleSelect = "puzzleSelect", //
  Progress = "progress", //
  PuzzlePause = "puzzlePause"
}

const puzzle_sequence = ["puzzles/tutorial2.json", "puzzles/tutorial4.json", "puzzles/tutorial3.json"];
// "puzzles/tutorial2.json", "puzzles/tutorial3.json"
let puzzle_index = 0;

class App extends React.Component<{}, GameState> {
  puzzle_manager: PuzzleManager

  constructor(props: {}) {
    super(props);
    load_stdlib();
    this.puzzle_manager = new PuzzleManager();
    this.puzzle_manager.initialize();

    //     // set up initial state, will get overwritten in componentDidMount
    //     let world = new WorldState();
    //     let defaultProgram = parse(`
    // repeat 4 times
    //     repeat 2 times
    //       Forward(4)
    //     PlaceCube(1)
    //     Right()
    // `) as Program;
    this.state = {
      program: EMPTY_PROGRAM,
      reset: false,
      world: new WorldState(),
      simulator: new IncrementalSimulator(new WorldState(), EMPTY_PROGRAM),
      lastSavedWorld: undefined,
      // restrictedBlockList: ["remove","repeat","defproc"]
      view: ViewType.Loading
    }
    // this.state.simulator.set_running();
    // this.state.world.mark_dirty();

  }

  load_puzzle(puzzle_file: string) {
    PuzzleState.make_from_file(puzzle_file, () => this.win_puzzle()).then(p => {
      let sim = new IncrementalSimulator(p.start_world, EMPTY_PROGRAM);
      const ast = parse(p.start_code);
      if (ast instanceof SyntaxError) {
        console.error(`Syntax Error: ${ast}`);
      } else {
        this.setState({
          program: ast,
          world: p.start_world,
          puzzle: p,
          simulator: sim,
          view: ViewType.Normal,
          reset: false,
          lastSavedWorld: undefined
        });
        text_to_blocks(p.start_code);
      }
    });
  }

  load_sandbox() {
    let world = new WorldState();
    world.mark_dirty();
    let sim = new IncrementalSimulator(world, parse('') as Program);
    this.setState({
      world: world,
      puzzle: SANDBOX_STATE,
      simulator: sim,
      reset: false,
      lastSavedWorld: undefined
    })
  }

  dialog() {
    let world = new WorldState();
    world.mark_dirty();
    let sim = new IncrementalSimulator(world, parse('') as Program);
    this.setState({
      world: world,
      puzzle: SANDBOX_STATE,
      simulator: sim,
      reset: false,
      view: ViewType.PuzzlePause
    })
  }
  win_puzzle() {
    puzzle_index++;
    if (puzzle_index < puzzle_sequence.length) {
      this.dialog();
      //this.load_puzzle(puzzle_sequence[puzzle_index]);
    } else {
      this.load_sandbox();
    }
  }

  componentDidMount() {
    //load the first puzzle once the page has loaded
    this.load_puzzle(puzzle_sequence[puzzle_index]);

  }

  run_program() {
    if (!this.state.reset) { // run program
      this.setState({
        lastSavedWorld: _.cloneDeep(this.state.world)
      })
      const program = blocks_to_text();
      const ast = parse(program);
      if (ast instanceof SyntaxError) {
        console.error(`Syntax Error: ${ast}`);
      } else {
        this.setState({
          simulator: new IncrementalSimulator(this.state.world, ast)
        }, () => this.state.simulator.set_running())
      }
    }
    else { // reset 
      this.setState({
        world: this.state.lastSavedWorld!,
        lastSavedWorld: undefined
      }, () => { this.state.world.mark_dirty() })
    }

    //switch the button 
    this.setState({
      reset: !this.state.reset
    });

  }

  continue() {
    this.setState({
      view: ViewType.Normal
    })
    //puzzle_index++;
    this.load_puzzle(puzzle_sequence[puzzle_index]);
  }

  render() {

    if (this.state.view === ViewType.Loading) {
      return (
        <h1>Loading...</h1>
      )
    } 
    else if (this.state.view === ViewType.PuzzlePause) {
      console.log("hhhhh");
      return <div className="App">
        <p>Good job! Click continue to go to the next puzzle!</p>
        <button onClick={()=> {this.continue()}}>Continue</button>
      </div>
    }
    else {
      return (
        <div className="App">

          {/* <PackSelect manager={this.puzzle_manager}/>
          <PuzzleSelect manager={this.puzzle_manager}/> */}
          {/* Navigation bar*/}
          {/* Code area}
            Blockly
            Control buttons  */}
          <Run reset={this.state.reset} onClick={() => { this.run_program() }} />
          <div id="main-view-code">
            <BlocklyComp {...this.state} />
          </div>
          <div id="main-view-game">
            <Display {...this.state} />
            <div id="instructions-display" className="goal-section instructions">
              <div id="instructions-goal">
                {this.state.puzzle &&
                  <p dangerouslySetInnerHTML={{ __html: this.state.puzzle?.instructions }} />
                }
              </div>
            </div>
          </div>
          {/* Game area
              Camera controls
              3D view
              Other controls
              Instructions   */}
        </div>
      );
    }
  }
}

export default App;
