import React from 'react';
import * as THREE from 'three';
import BlocklyComp /*{ print_blocks }*/ from './BlocklyComp';
import Display from './Display';
import WorldState from './WorldState';
import { load_stdlib, IncrementalSimulator, SimulatorState } from './Simulator';
import parse, { Program } from './Parser';

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

  render() {
    return (
      <div className="App">
        {/* Navigation bar */}
        {/* Code area
            Blockly
            Control buttons  */}
        {/* <button onClick={() => print_blocks()} /> */}
            {/* <button onClick={() => this.change_state()} */}
        <BlocklyComp />
        <Display world={this.state} simulator={this.sim}/>
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
