/* FILENAME:    App.tsx
 * DESCRIPTION: 
 *      This file manages all other source and puzzle files. It sets up different components 
 *      in the page, its state contains info about all puzzles, simulator, world and ViewType.
 * DATE:    08/19/2021
 * AUTHOR:      Aaron Bauer    Katrina Li    Teagan Johnson
 */
import React from 'react';
import BlocklyComp, { blocks_to_text, text_to_blocks } from './BlocklyComp';
import Display from './Display';
import WorldState from './WorldState';
import { load_stdlib, IncrementalSimulator } from './Simulator';
import parse, { EMPTY_PROGRAM, Program, SyntaxError } from './Parser';
import PuzzleState, { SANDBOX_STATE } from './PuzzleState';
import { Run } from './RunButton';
import { InstructionsGoal } from './InstructionsGoal';
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
}

export enum ViewType {
  Loading = "loading",
  Normal = "normal",
  PuzzleSelect = "puzzleSelect",
  SequencePause = "sequencePause", // when a user finished solving the last puzzle in a sequence
  PuzzlePause = "puzzlePause", // when a user finished solving a puzzle, shows a congratulation box
  LearnMore = "learnMore" // lets the user switch between puzzle packs
}

/* 
 * The App sets up different components in the page. Its state contains info about all puzzles
 * (with extra info about the current one), simulator, world and ViewType.
 * It also passes the entire state to Display and BlocklyComp (large components), as well as
 * PuzzleSelect, Runbutton and InstructionsGoal (small components)
 */

class App extends React.Component<{}, GameState> {
  puzzle_manager: PuzzleManager

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
      devMode: false
    }
    this.puzzle_manager = new PuzzleManager();
    // this.clean_progress();
    this.load_last_progress();
  }

  // the learn more button, lets the user access a different puzzle pack
  learn_more(pack: number) {
    this.puzzle_manager.set_pack(pack);
    this.setState({
      view: ViewType.Normal
    });
    this.load_puzzle(`puzzles/${this.puzzle_manager.get_current_puzzle().tag}.json`);

  }

  // stores which puzzles the user finishes in localStorage
  save_progress() {
    let progress = JSON.stringify([...this.puzzle_manager.completed_puzzle]);
    window.localStorage.setItem("progress", progress);

    // commenting this out for now, as it breaks puzzle progression (next_puzzle() advances to the next puzzle, causing a double advance)
    // let next_puzzle = JSON.stringify([this.puzzle_manager.next_puzzle()]);
    // window.localStorage.setItem("puzzle", next_puzzle);
  }

  // used for developing purposes, cleans the user's progress in local storage
  clean_progress() {
    window.localStorage.removeItem("progress");
    this.puzzle_manager.completed_puzzle.clear();
  }


  // search for the user's progress in local storage. If the user had completed a puzzle before,
  // mark it as completed again
  load_last_progress() {
    // return window.localStorage.getItem("progress");
    let progress_string = window.localStorage.getItem("progress");
    if (progress_string) {
      this.puzzle_manager.set_completed_puzzle(new Map(JSON.parse(progress_string)));
    }

    // let puzzle_string = window.localStorage.getItem("puzzle");
    // if (puzzle_string) {
    //   // console.log(`puzzles/${puzzle.tag}.json`);

    //   this.load_puzzle(`puzzles/${(new Map(JSON.parse(puzzle_string))).tag}.json`);
    // } else {
    //   this.load_sandbox();
    // }
  }

  // stores the blocks that the user puts in sandbox mode
  save_sandbox() {
    window.localStorage.setItem("sandbox", blocks_to_text());
  }

  // check whether the user run in sandbox mode before, if so, load the blocks that had been run
  load_last_sandbox() {
    let program = window.localStorage.getItem("sandbox");
    if (program) {
      console.log("program: " + program);
      this.setState({program: parse(program) as Program}, () => {
        text_to_blocks(program!);
      });
    }
    else {
      text_to_blocks('');
    }
  }

  // initiates PuzzleState and puzzle manager, sets the current puzzle, change the state according to puzzle
  load_puzzle(puzzle_file: string) {
    PuzzleState.make_from_file(puzzle_file, () => this.win_puzzle()).then(p => {
      let sim = new IncrementalSimulator(p.start_world, EMPTY_PROGRAM);
      const ast = parse(p.start_code);
      if (ast instanceof SyntaxError) {
        console.error(`Syntax Error: ${ast}`);
      } else {
        this.puzzle_manager.set_puzzle(p.tag);
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

  // set the simulator and state to sandbox mode
  load_sandbox() {
    this.load_last_progress();
    let world = new WorldState();
    world.mark_dirty();
    let sim = new IncrementalSimulator(world, parse('') as Program);
    this.setState({
      world: world,
      puzzle: SANDBOX_STATE,
      simulator: sim,
      view: ViewType.Normal,
      reset: false,
      lastSavedWorld: undefined
    })
    // HACK: make the puz_index invalid, so that get_current_puzzle() returns undefined
    this.puzzle_manager.current_puzzle.puz_index = -1;
    this.puzzle_manager.get_granted_blocks(false);
    this.load_last_sandbox();
  }

  // when the user completes a puzzle
  win_puzzle() {
    this.puzzle_manager.complete_puzzle();
    //this.puzzle_manager.print_completed_puzzle();

    if (this.puzzle_manager.check_complete_pack()) {
      this.setState({
        view: ViewType.SequencePause
      });
      // this.load_sandbox();
    } else {
      this.setState({
        view: ViewType.PuzzlePause
      })
    }
    this.save_progress();
  }

  // only used for developers
  toggle_dev_mode() {
    this.setState({
      devMode: !this.state.devMode
    });
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
        }, () => this.state.simulator.set_running());
        if (this.state.puzzle === SANDBOX_STATE) {
          this.save_sandbox();
        }
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
    let puzzle = this.puzzle_manager.next_puzzle();
    if (puzzle) {
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

  // return a string that would show in a 'Current puzzle' box at the top right corner
  current_puzzle() {
    if (this.state.puzzle === SANDBOX_STATE) {
      return "Sandbox";
    }
    else {
      return JSON.stringify(this.state.puzzle?.name);
    }
  }


  render() {

    if (this.state.view === ViewType.Loading) {
      return (
        <h1>Loading...</h1>
      )
    }

    else if (this.state.view === ViewType.PuzzleSelect) {
      return (
        <PuzzleSelect
          gameState={{...this.state}}
          current_pack={this.puzzle_manager.get_current_pack()}
          current_puzzle={this.puzzle_manager.get_current_puzzle()}
          completed_puzzles={this.puzzle_manager.find_completed_puzzle()}
          granted_blocks={this.puzzle_manager.get_granted_blocks(this.state.devMode)}
          onClickHome={(puzzle_tag) => {
            this.setState({
              view: ViewType.Normal,
              devMode: false
            });
            this.load_puzzle(puzzle_tag);
          }}
          onClickToPuzzle={(puzzle_tag) => {
            this.setState({
              view: ViewType.Normal,
              devMode: false
            });
            this.load_puzzle(puzzle_tag);
          }} 
          loadLastSandbox={() => {
            this.setState({
              view: ViewType.Normal
            });
            this.load_last_sandbox();
          }}
          />
      )
    }

    else if (this.state.view === ViewType.LearnMore) {
      return (
        <div className="LearnMore">
          <header id="header">
            <div><h1>Choose a pack:</h1></div>
          </header>

          <button className="standard-back" onClick={() => this.learn_more(0)}>
            <span className="standard-front">
              Standard
            </span>
          </button>
          <button className="test-back" onClick={() => this.learn_more(1)}>
            <span className="test-front">
              Test
            </span>
          </button>
        </div>
      )
    }

    else {
      return (
        <div className="App">
          <header id="header" className="navbar">
            <div className='header-name'><h1>Dragon Architect</h1></div>
            <div className="puzzle-selection-name-and-button">
              <div className="current-puzzle-name">
                <h5>Current Puzzle: {this.current_puzzle()}</h5>
              </div>
              <div className='puzzle-select-toggle'>
                <button className='puzzle-select-toggle-button-back' onClick={() => this.setState({ view: ViewType.PuzzleSelect })}>
                  <span className='puzzle-select-toggle-button-front'>
                    Puzzle Select
                  </span>
                </button>
              </div>
              <div className='sandbox-toggle'>
                <button className='sandbox-toggle-button-back' onClick={() => { this.load_sandbox(); }}>
                  <span className='sandbox-toggle-button-front'>
                    Sandbox Mode
                  </span>
                </button>
              </div>
            </div>
            {/* </div> */}
          </header>
          {process.env.NODE_ENV !== 'production' && <div className='dev-controls-header'>
            <div className='pack-container'>
              <label htmlFor="pack-select" className='pack-label'>Select a pack:</label>
              <select name="pack-select" id="pack-select" className='pack-select' onChange={event => this.on_change_pack(event)}>
                {this.puzzle_manager.packs.map((pack, index) => <option key={index} value={index}>{pack.name}</option>)}
              </select>
            </div>
            <div className='puzzle-container'>
              <label htmlFor="puzzle-select" className='puzzle-label'>Select a puzzle:</label>
              <select name="puzzle-select" id="puzzle-select" className='puzzle-select' onChange={event => this.load_puzzle(`puzzles/${event.target.value}.json`)}>
                {this.puzzle_manager.get_all_puzzles().map(puzzle => <option key={puzzle} value={puzzle}>{puzzle}</option>)}
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

              <div id="learn-more" className='learn-more-container'>
                <button name="learn-more" className='learn-more-button-back' onClick={() => this.setState({ view: ViewType.LearnMore })}>
                  <span className='learn-more-button-front'>
                    Learn More
                  </span>
                </button>
              </div>

              <div id="save-progress" className='save-progress-container'>
                <button name="save-progress" className='save-progress-button-back' onClick={() => this.clean_progress()}>
                  <span className='save-progress-button-front'>
                    Clean Progress
                  </span>
                </button>
              </div>

            </div>
          </div>}

          <div id="main-view-code">
            <BlocklyComp granted_blocks={this.puzzle_manager.get_granted_blocks(this.state.devMode)} {...this.state} />
          </div>

          {(this.state.view === ViewType.SequencePause) && (this.state.reset) &&
            <div className='sandbox-congrats-box'>
              <h4>You finished all puzzles in this sequence!</h4>
              <button className='congrats-button-back' onClick={() => { this.load_sandbox(); }}>
                <span className='congrats-button-front'>
                  <h2>Go To Sandbox</h2>
                </span>
              </button>
            </div>}


          {(this.state.view === ViewType.PuzzlePause) &&
            <div className='congrats-box'>
              <h4>Good job!</h4>
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
                <InstructionsGoal gamestate={this.state} />
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
