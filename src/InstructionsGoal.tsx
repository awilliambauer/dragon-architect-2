/* FILENAME:    InstructionsGoal.tsx
 * DESCRIPTION: 
 *      This file contains a function that returns a puzzle/sandbox instruction as a paragraph element
 * DATE:    08/19/2021
 * AUTHOR:      Aaron Bauer    Katrina Li    Teagan Johnson
 */
import { GameState } from './App';
import { SANDBOX_STATE } from './PuzzleState';

type InstructionsProps = {
    gamestate: GameState //passed from App
}


// returns a correct instruction as a paragraph element when the user solves a puzzle or plays in sandbox mode
export function InstructionsGoal(props: InstructionsProps) {
    if (props.gamestate.puzzle === SANDBOX_STATE) {
        return <p>Welcome to Sandbox mode! Create anything you like!</p>;
    } else if (props.gamestate.puzzle) {
        return <p dangerouslySetInnerHTML={{ __html: props.gamestate.puzzle?.instructions }} />;
    } else {
        return <p></p>;
    }
}