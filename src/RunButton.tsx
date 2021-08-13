import { ViewType } from "./App";
import { GameState } from './App';

type RunProps = {
    gamestate: GameState
    onClick: () => void
}

export function Run(props: RunProps) {
    let msg = props.gamestate.reset ? "Reset" : "Run";
    let col = props.gamestate.reset ? "reset" : "run";
    if (col === "run") {
        props.gamestate.view = ViewType.Normal;
    }
    return (
        <button id="game-control-btn-playback" className="run-button-back" onClick={props.onClick} value={col}>
            <span className="run-button-front" title={col}>
                {msg}
            </span>
        </button>
    )
}
