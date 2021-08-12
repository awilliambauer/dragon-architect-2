import React from 'react';
import { GameState } from './App';
import "./css/index.css"

interface PuzzleSelectProps {
    gameState: GameState;
    onClickFunction: (e: string) => void;
}

export default class PuzzleSelect extends React.Component<PuzzleSelectProps> {

    constructor(props: PuzzleSelectProps) {
        super(props);
    }

    openPuzzle(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        this.props.onClickFunction(`puzzles/${event.currentTarget.id}.json`);
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
                                        return (
                                            <button className="puzzle-select-button-back" id={puzzle.tag}
                                                value={String(this.props.gameState.puzzle_manager.find_completed_puzzle()?.includes(puzzle.name))}
                                                onClick={event => this.openPuzzle(event)}>
                                                    <span className='puzzle-select-button-front' title={String(this.props.gameState.puzzle_manager.find_completed_puzzle()?.includes(puzzle.name))}>
                                                        {puzzle.name}
                                                    </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    }
}