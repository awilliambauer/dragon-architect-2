import React from 'react';
import * as THREE from 'three';
import BlocklyComp, { blocks_to_text } /*{ print_blocks }*/ from './BlocklyComp';
import Display from './Display';
import WorldState from './WorldState';
import run, { load_stdlib, IncrementalSimulator, SimulatorState, RecursiveSimulator } from './Simulator';
import parse, { Program, SyntaxError } from './Parser';

class App extends React.Component {
  state: WorldState = new WorldState();
  sim: IncrementalSimulator;

  constructor(props: {}) {
    super(props);
    load_stdlib();
    this.sim = new IncrementalSimulator(this.state, parse(`
repeat 4 times
    repeat 2 times
      Forward(2)
    Right()
`) as Program);
    this.sim.sim_state = SimulatorState.Running;

    // Testing:
    // Tests the end position of the dragon
    this.state.dragon_pos.set(4, 2, 3);
    // Tests the direction of the arrow helper (MUST BE A UNIT VECTOR)
    this.state.dragon_dir.set(-1, 0, 0);
    // Tests the location and colors of cubes
    this.state.cube_map.set(new THREE.Vector3(1, 3, 1), 1);
    this.state.cube_map.set(new THREE.Vector3(1, 3, 3), 3);
    this.state.cube_map.set(new THREE.Vector3(2, 2, 3), 2);
  }

  change_state() {

  }

  run_program() {
    const program = blocks_to_text();
    const ast = parse(program);
    if (ast instanceof SyntaxError) {
      console.error(`Syntax Error: ${ast}`);
    } else {
      run(this.state, ast);
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
          <Display world={this.state} simulator={this.sim} />
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
