import React from 'react';
import * as THREE from 'three';
import BlocklyComp, { blocks_to_text } from './BlocklyComp';
import Display from './Display';
import WorldState from './WorldState';
import run, { load_stdlib, IncrementalSimulator, SimulatorState } from './Simulator';
import parse, { Program, SyntaxError } from './Parser';
import PuzzleState from './PuzzleState';
import { Run } from './RunButton';
import _ from 'lodash';
import Slider from './Slider';

export type GameState = {
  program: Program
  world: WorldState
  puzzle?: PuzzleState
  simulator: IncrementalSimulator
  reset: boolean
  lastSavedWorld: WorldState | undefined
}

class App extends React.Component<{}, GameState> {

  constructor(props: {}) {
    super(props);
    load_stdlib();

    // set up initial state, will get overwritten in componentDidMount
    let world = new WorldState();
    let defaultProgram = parse(`
repeat 4 times
    repeat 2 times
      Forward(4)
    PlaceCube(1)
    Right()
`) as Program;
    this.state = {
      program: defaultProgram,
      reset: false,
      world: world,
      simulator: new IncrementalSimulator(world, defaultProgram),
      lastSavedWorld: undefined
    }
    this.state.simulator.set_running();
    this.state.world.mark_dirty();
    
  }

  componentDidMount() {
    // load the puzzle specification from puzzles/test.json
    // and then use it to set the game state
    PuzzleState.make_from_file("puzzles/test.json").then(p => {
      let defaultProgram = parse(`
repeat 4 times
    repeat 2 times
      Forward(4)
    PlaceCube(2)
    Right()
`) as Program;
      let sim = new IncrementalSimulator(p.start_world, defaultProgram);
      sim.sim_state = SimulatorState.Running;
      this.setState({
        program: defaultProgram,
        world: p.start_world,
        puzzle: p,
        simulator: sim,
        reset: false,
        lastSavedWorld: undefined

      });
    });
  }

  run_program() {
    // const program = blocks_to_text();
    // const ast = parse(program);
    // if (ast instanceof SyntaxError) {
    //   console.error(`Syntax Error: ${ast}`);
    // } else {
    //   run(this.state.world, ast);
    // }

    if (!this.state.reset) { // run program
      this.setState({
        lastSavedWorld: _.cloneDeep(this.state.world)
      })
      const program = blocks_to_text();
      const ast = parse(program);
      if (ast instanceof SyntaxError) {
        console.error(`Syntax Error: ${ast}`);
      } else {
        run(this.state.world, ast);
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

  render() {
    return (
      <div className="App">
        {/* Navigation bar */}
        {/* Code area
            Blockly
            Control buttons  */}
        <button onClick={() => console.log(blocks_to_text())}>blocks_to_text</button>
        
        <Run reset= {this.state.reset} world={this.state.world} program={this.state.program}
         simulator={this.state.simulator} onClick = {() => {this.run_program()}} />
        

        {/* <button onClick={() => this.change_state()} */}
        <div id="slider">
          <Slider {...this.state} />
        </div>
        <div id="main-view-code">
          <BlocklyComp {...this.state} />
        </div>
        <div id="main-view-game">
          <Display {...this.state} />
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
