import { ViewType } from "./App";
import { GameState } from './App';
import PuzzleState, { SANDBOX_STATE } from './PuzzleState';

type InstructionsProps = {
    gamestate: GameState
}

export function InstructionsGoal(props: InstructionsProps) {

    if (props.gamestate.puzzle === SANDBOX_STATE) {
        return <p>Welcome to Sandbox mode! Create anything you like!</p>;
    } else if (props.gamestate.puzzle) {
        return <p dangerouslySetInnerHTML={{ __html: props.gamestate.puzzle?.instructions }} />;
    } else {
        return <p></p>;
    }
}