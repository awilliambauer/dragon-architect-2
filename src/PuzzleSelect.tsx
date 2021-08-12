import React from 'react';
import { GameState } from './App';
import "./css/index.css"
import { load_stdlib } from './Simulator';

interface PuzzleSelectProps {
    gameState: GameState;
    onClickFunction: (e: string) => void;
}

export default class PuzzleSelect extends React.Component<PuzzleSelectProps> {

    constructor(props: PuzzleSelectProps) {
        super(props);
        load_stdlib();
    }

    openPuzzle(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        //this.props.gameState.puzzle_manager.set_pack(parseInt(event.currentTarget.value));
        this.props.onClickFunction(`puzzles/${event.currentTarget.value}.json`);
    }

    render() {
        return (
            <div className="select-puzzle-screen">
                <h1>Puzzle Select</h1>
                <h3>Select Which Puzzle You Would Like to Go To!</h3>
                <div className="select-puzzle-buttons-container">
                    {this.props.gameState.puzzle_manager.get_current_pack().seqs.map(seq => {
                        return (
                            <div className="puzzle-select-seq-container">
                                <h2>{seq.name}</h2>
                                <div className="puzzle-select-buttons">
                                    {seq.puzzles.map(puzzle => {
                                        return <button value={puzzle.tag} onClick={event => this.openPuzzle(event)}>{puzzle.tag}</button>
                                    })}
                                </div>
                            </div>);
                    })}
                </div>
            </div>
        )
    }
}