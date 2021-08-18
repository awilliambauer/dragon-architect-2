import React from 'react';
import { GameState } from './App';
import "./css/index.css"
import { PuzzlePack } from './PuzzleManager';
import { PuzzleSpec } from './PuzzleState';
import { SANDBOX_STATE } from './PuzzleState';

interface PuzzleSelectProps {
    gameState: GameState;
    current_pack: PuzzlePack;
    current_puzzle: PuzzleSpec;
    completed_puzzles: string[];
    onClickToPuzzle: (e: string) => void;
    onClickHome: (e: string) => void;
    loadLastSandbox: () => void;
}

export default class PuzzleSelect extends React.Component<PuzzleSelectProps> {

    returnHome(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (this.props.gameState.puzzle !== SANDBOX_STATE) {
            this.props.onClickHome(`puzzles/${this.props.current_puzzle.tag}.json`);
        }
        else {
            this.props.loadLastSandbox();
        }
    }

    openPuzzle(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        this.props.onClickToPuzzle(`puzzles/${event.currentTarget.id}.json`);
    }

    render() {
        return (
            <div className="select-puzzle-screen">
                <div className='puzzle-select-title'>
                <h1>Puzzle Select</h1>
                <h3>Select Which Puzzle You Would Like to Go To!</h3>
                </div>
                <div className='home-button-container'>
                    <button className='home-button-back' onClick={event => this.returnHome(event)}>
                        <span className='home-button-front'>
                            Home
                        </span>
                    </button>
                </div>
                
                <div className="select-puzzle-buttons-container">
                    {this.props.current_pack.seqs.map(seq => {
                        return (
                            <div key={seq.name} className="puzzle-select-seq-container">
                                <h2>{seq.name}</h2>
                                <div className="puzzle-select-buttons">
                                    {seq.puzzles.map(puzzle => {
                                        return (
                                            <button key={puzzle.name} className="puzzle-select-button-back" id={puzzle.tag}
                                                value={String(this.props.completed_puzzles.includes(puzzle.name))}
                                                onClick={event => this.openPuzzle(event)}>
                                                <span className='puzzle-select-button-front' title={String(this.props.completed_puzzles.includes(puzzle.name))}>
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