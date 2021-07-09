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
    this.state.dragon_pos.set(1, 2, 3);
    this.state.dragon_dir.set(-1, 0, 0);
    this.state.cube_map.set(new THREE.Vector3(1, 1, 1), 3);
  }

  render() {
    return (
      <div className="App">
        {/* Navigation bar */}
        {/* Code area
            Blockly
            Control buttons  */}
        {/* <button onClick={() => print_blocks()} /> */}
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
