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
import PuzzleManager from './PuzzleManager';
import { timeStamp } from 'console';
import "./css/index.css"

export type GameState = {
  program: Program
  world: WorldState
  puzzle?: PuzzleState
  simulator: IncrementalSimulator
  reset: boolean
  lastSavedWorld: WorldState | undefined
  grantedBlocks: Array<string>
  view: ViewType
}

export enum ViewType {
  Loading = "loading",
  Normal = "normal",
  PuzzleSelect = "puzzleSelect", //
  Progress = "progress", //
  PuzzlePause = "puzzlePause"
}

class App extends React.Component<{}, GameState> {
  puzzle_manager: PuzzleManager

  constructor(props: {}) {
    super(props);
    load_stdlib();
    this.puzzle_manager = new PuzzleManager();

    this.state = {
      program: EMPTY_PROGRAM,
      reset: false,
      world: new WorldState(),
      simulator: new IncrementalSimulator(new WorldState(), EMPTY_PROGRAM),
      lastSavedWorld: undefined,
      grantedBlocks: new Array<string>(),
      view: ViewType.Loading
    }
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

  // when the user completes a puzzle
  win_puzzle() {
    this.puzzle_manager.complete_puzzle();
    //this.puzzle_manager.print_completed_puzzle();
    this.setState({
      view: ViewType.PuzzlePause
    })
  }

  get_granted_blocks() {
    for (let pack of this.puzzle_manager.completed_puzzle.keys()) {
        let puzzles = this.puzzle_manager.completed_puzzle.get(pack);
        
        if (puzzles){
            for (let puzzle of puzzles) {
                let blocks = puzzle.library.granted;
                for (let block of blocks) {
                  if (!this.puzzle_manager.granted_blocks.includes(block))
                  this.puzzle_manager.granted_blocks.push(block);
                }
            }
        }  
    }
    this.setState({
      grantedBlocks: this.puzzle_manager.granted_blocks
    })
  }

  componentDidMount() {
    this.puzzle_manager.initialize()
      .then(() => {
        this.setState({
          view: ViewType.Normal
        }, () => this.load_puzzle(`puzzles/${this.puzzle_manager.get_current_puzzle().tag}.json`));
      })
  }


  // run the user's current block program
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
      this.get_granted_blocks();
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
    this.get_granted_blocks();

  }

  // when user clicks the "continue" button after completing a puzzle
  continue() {
    this.setState({
      view: ViewType.Normal
    });
    let puzzle = this.puzzle_manager.next_puzzle();
    if (puzzle) {
      // console.log(`puzzles/${puzzle.tag}.json`);
      this.load_puzzle(`puzzles/${puzzle.tag}.json`);
    } else {
      this.load_sandbox();
    }
  }

  // called when a new pack is selected via the drop-down
  on_change_pack(event: React.ChangeEvent<HTMLSelectElement>) {
    this.puzzle_manager.set_pack(parseInt(event.target.value));
    this.load_puzzle(`puzzles/${this.puzzle_manager.get_current_puzzle().tag}.json`);
  }

  render() {

    if (this.state.view === ViewType.Loading) {
      return (
        <h1>Loading...</h1>
      )
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
          <header id="header" className="navbar">
            <div id="header-items">
              <h1>Dragon Architect</h1>
              <div id="dev-controls">
                <label htmlFor="pack-select">Select a pack:</label>
                <select name="pack-select" id="pack-select" onChange={event => this.on_change_pack(event)}>
                  {this.puzzle_manager.packs.map((pack, index) => <option key={index} value={index}>{pack.name}</option>)}
                </select>
                <label htmlFor="puzzle-select">Select a puzzle:</label>
                <select name="puzzle-select" id="puzzle-select" onChange={event => this.load_puzzle(`puzzles/${event.target.value}.json`)}>
                  {this.puzzle_manager.get_all_puzzles().map(puzzle => <option key={puzzle} value={puzzle}>{puzzle}</option>)}
                </select>
              </div>
            </div>
          </header>
          <Run reset={this.state.reset} onClick={() => { this.run_program(); this.get_granted_blocks() }} />
          <div id="main-view-code">
            <BlocklyComp {...this.state} />
          </div>

          {(this.state.view === ViewType.PuzzlePause) &&
            <div style={{ width: '200px', height: '100px', left: '500px', backgroundColor: '#964B00', color: 'yellow', position: 'absolute' }}>
              <p>Good job! Click continue to go to the next puzzle!</p>
              <button onClick={() => { this.continue(); this.get_granted_blocks() }}>Continue</button>
            </div>}

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
