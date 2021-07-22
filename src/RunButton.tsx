import _ from 'lodash';
import WorldState from './WorldState';
import {IncrementalSimulator, SimulatorState } from './Simulator';
import { Program} from './Parser';



type RunProps = {
    reset: boolean
    onClick: () => void
    world: WorldState
    program: Program
    simulator: IncrementalSimulator
    
}


export function Run(props: RunProps) {
    //new IncrementalSimulator
    let sim = new IncrementalSimulator(props.world, props.program);

    //set simulator to be running
    sim.sim_state = SimulatorState.Running;

    //save current world state
    //let curWorld = _.cloneDeep(props.world); <- now moved to run_program() in App

    
    let msg = props.reset ? "Reset" : "Run Program"
    
    return (
        
        <button id="btn-run" onClick = {props.onClick}>
            {msg}
        </button>
        
    )
}

