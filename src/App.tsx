import React from 'react';
import * as THREE from 'three';
import BlocklyComp, { blocks_to_text } /*{ print_blocks }*/ from './BlocklyComp';
import Display from './Display';
import WorldState from './WorldState';
import run, { load_stdlib, IncrementalSimulator, SimulatorState, RecursiveSimulator } from './Simulator';
import parse, { Program, SyntaxError } from './Parser';
import PuzzleState from './PuzzleState';

export type GameState = {
  world: WorldState,
  puzzle?: PuzzleState
  sim: IncrementalSimulator
}

class App extends React.Component<{}, GameState> {

  constructor(props: {}) {
    super(props);
    load_stdlib();

    // set up initial state, will get overwritten in componentDidMount
    let world = new WorldState();
    this.state = {
      world: world,
      sim: new IncrementalSimulator(world, parse(`
repeat 4 times
    repeat 2 times
      Forward(2)
    Right()
`) as Program)
    }
    this.state.sim.set_running();
    this.state.world.mark_dirty();
  }

  componentDidMount() {
    // load the puzzle specification from puzzles/test.json
    // and then use it to set the game state
    PuzzleState.make_from_file("puzzles/test.json").then(p => {
      let sim = new IncrementalSimulator(p.start_world, parse(``) as Program);
      sim.sim_state = SimulatorState.Running;
      this.setState({
        world: p.start_world,
        puzzle: p,
        sim: sim
      });
    });
  }

  run_program() {
    const program = blocks_to_text();
    const ast = parse(program);
    if (ast instanceof SyntaxError) {
      console.error(`Syntax Error: ${ast}`);
    } else {
      run(this.state.world, ast);
    }
  }

  render() {
    return (
      <div className="App">
        {/* Navigation bar */}
        {/* Code area
            Blockly
            Control buttons  */}
        <button onClick={() => console.log(blocks_to_text())}>blocks_to_text</button>
        <button onClick={() => this.run_program()}>Run Program</button>
        {/* <button onClick={() => this.change_state()} */}
        <div id="main-view-code">
          <BlocklyComp />
        </div>
        <div id="main-view-game">
          <Display world={this.state.world} puzzle={this.state.puzzle} simulator={this.state.sim} />
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

export default App;
