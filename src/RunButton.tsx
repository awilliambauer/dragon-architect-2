/* FILENAME:    RunButton.tsx
 * DESCRIPTION: 
 *      This file contains the run button that executes the dragon movement.
 *      Child of App.tsx
 * DATE:    08/19/2021
 * AUTHOR:      Teagan Johnson   Aaron Bauer    Katrina Li
 */
import { GameState } from './App';

// Props of the run button include the gamestate and the on click function
type RunProps = {
    gamestate: GameState
    onClick: () => void
}

export function Run(props: RunProps) {
    let msg = props.gamestate.reset ? "Reset" : "Run";
    let col = props.gamestate.reset ? "reset" : "run";
    return (
        <button id="game-control-btn-playback" className="run-button-back" onClick={props.onClick} value={col}>
            <span className="run-button-front" title={col}>
                {msg}
            </span>
        </button>
    )
}
