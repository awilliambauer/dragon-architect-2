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
import "./css/index.css"
import "./FontAwesomeIcons";
import PuzzleSelect from './PuzzleSelect';


export type GameState = {
  program: Program
  world: WorldState
  puzzle?: PuzzleState
  simulator: IncrementalSimulator
  reset: boolean
  lastSavedWorld: WorldState | undefined
  devMode: boolean
  view: ViewType
  puzzle_manager: PuzzleManager
}

export enum ViewType {
  Loading = "loading",
  Normal = "normal",
  PuzzleSelect = "puzzleSelect", //
  Progress = "progress", //
  PuzzlePause = "puzzlePause"
}



class App extends React.Component<{}, GameState> {

  constructor(props: {}) {
    super(props);
    load_stdlib();

    this.state = {
      program: EMPTY_PROGRAM,
      reset: false,
      world: new WorldState(),
      simulator: new IncrementalSimulator(new WorldState(), EMPTY_PROGRAM),
      lastSavedWorld: undefined,
      view: ViewType.Loading,
      puzzle_manager: new PuzzleManager(),
      devMode: false
    }
  }

  check_local() {
    window.localStorage.setItem("player_progress", "empty");
    console.log(window.localStorage.getItem("player_progress"));
  }

  save_progress() {
    window.localStorage.setItem("progress", this.state.puzzle_manager.find_completed_puzzle()[-1]); //temporary
  }

  load_last_progress() {
    return window.localStorage.getItem("progress");
  }

  save_sandbox() {
    window.localStorage.setItem("sandbox", blocks_to_text());
  }

  load_last_sandbox() {
    console.log("calling load-last-sandbox");
    return window.localStorage.getItem("sandbox");
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
        this.state.puzzle_manager.set_puzzle(p.tag);
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
    this.state.puzzle_manager.complete_puzzle();
    //this.puzzle_manager.print_completed_puzzle();
    this.setState({
      view: ViewType.PuzzlePause
    })
  }

  toggle_dev_mode() {
    this.setState({
      devMode: !this.state.devMode
    });
  }

  componentDidMount() {
    this.state.puzzle_manager.initialize()
      .then(() => {
        this.setState({
          view: ViewType.Normal
        }, () => this.load_puzzle(`puzzles/${this.state.puzzle_manager.get_current_puzzle().tag}.json`));
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

  // when user clicks the "continue" button after completing a puzzle
  continue() {
    this.setState({
      view: ViewType.Normal
    });
    let puzzle = this.state.puzzle_manager.next_puzzle();
    if (puzzle) {
      console.log(`puzzles/${puzzle.tag}.json`);
      this.load_puzzle(`puzzles/${puzzle.tag}.json`);
    } else {
      this.load_sandbox();
    }
  }

  // called when a new pack is selected via the drop-down
  on_change_pack(event: React.ChangeEvent<HTMLSelectElement>) {
    this.state.puzzle_manager.set_pack(parseInt(event.target.value));
    this.load_puzzle(`puzzles/${this.state.puzzle_manager.get_current_puzzle().tag}.json`);
  }

  render() {

    if (this.state.view === ViewType.Loading) {
      return (
        <h1>Loading...</h1>
      )
    }

    else if (this.state.view === ViewType.PuzzleSelect) {
      return (
        <PuzzleSelect gameState={this.state} onClickFunction={(puzzle_tag) => {
          this.load_puzzle(puzzle_tag)
          this.setState({
            view: ViewType.Normal
          });
        }} />
      )
    }

    else {
      return (
        <div className="App">
          <header id="header" className="navbar">
            {/* <div id="header-items"> */}
            {/* <div className="run-button">
              <Run reset={this.state.reset} onClick={() => { this.run_program(); this.get_granted_blocks() }} />
            </div> */}
            <div className='header-name'><h1>Dragon Architect</h1></div>
            <div className="puzzle-selection-name-and-button">
              <div className="current-puzzle-name">
                <h5>Current Puzzle: <h4>{JSON.stringify(this.state.puzzle?.name)}</h4></h5>
              </div>
              <div className='puzzle-select-toggle'>
                  <button className='puzzle-select-toggle-button-back' onClick={() => this.setState({view: ViewType.PuzzleSelect})}>
                    <span className='puzzle-select-toggle-button-front'>
                      Go to puzzle select
                    </span>
                  </button>
              </div>
            </div>
            {/* </div> */}
          </header>
          <div className='dev-controls-header'>
            <div className='pack-container'>
              <label htmlFor="pack-select" className='pack-label' style={{ color: 'white' }}>Select a pack:</label>
              <select name="pack-select" id="pack-select" className='pack-select' onChange={event => this.on_change_pack(event)}>
                {this.state.puzzle_manager.packs.map((pack, index) => <option key={index} value={index}>{pack.name}</option>)}
              </select>
            </div>
            <div className='puzzle-container'>
              <label htmlFor="puzzle-select" className='puzzle-label' style={{ color: 'white' }}>Select a puzzle:</label>
              <select name="puzzle-select" id="puzzle-select" className='puzzle-select' onChange={event => this.load_puzzle(`puzzles/${event.target.value}.json`)}>
                {this.state.puzzle_manager.get_all_puzzles().map(puzzle => <option key={puzzle} value={puzzle}>{puzzle}</option>)}
              </select>
            </div>
            <div className="buttons-header-container">
              <div id="dev-mode-button" className='dev-mode'>
                <button name="dev-mode" className='dev-mode-button-back' onClick={() => this.toggle_dev_mode()}>
                  <span className='dev-mode-button-front'>
                    Toggle Dev Mode
                  </span>
                  </button>
              </div>
              <div id="save-progress" className='save-progress-container'>
                <button name="save-progress" className='save-progress-button-back' onClick={() => this.save_progress()}>
                  <span className='save-progress-button-front'>
                    Save Progress
                  </span>
                </button>
              </div>
              
              <div id="save-sandbox" className='save-sandbox-container'>
                <button name="save-sandbox" className='save-sandbox-button-back' onClick={() => this.save_sandbox()}>
                  <span className='save-sandbox-button-front'>
                    Save Sandbox
                  </span>
                </button>
              </div>

              <div id="load-sandbox" className='load-sandbox-container'>
                <button name="load-sandbox" className='load-sandbox-button-back' onClick={() => console.log(this.load_last_sandbox())}>
                  <span className='load-sandbox-button-front'>
                    Load Sandbox
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div id="main-view-code">
            <BlocklyComp {...this.state} />
          </div>

          {(this.state.view === ViewType.PuzzlePause) && (this.state.reset) &&
            <div className='congrats-box'>
              <h4 style={{color: 'white' }}>Good job!</h4>
              <button className='congrats-button-back' onClick={() => { this.continue(); }}>
                <span className='congrats-button-front'>
                  <h2>Next Puzzle</h2>
                </span>
              </button>
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

          <div className="run-button-container">
              <Run gamestate={this.state} onClick={() => { this.run_program(); }} />
          </div>

        </div>
      );
    }
  }
}

export default App;
