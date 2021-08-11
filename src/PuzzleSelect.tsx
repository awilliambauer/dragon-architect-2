import React, { ButtonHTMLAttributes, ChangeEvent, DetailedHTMLProps } from 'react';
import * as THREE from 'three';
import { GameState } from './App';
import on_change_pack from './App';
import load_puzzle from './App';
import { Material } from 'three';
import { GoalInfo, GoalInfoType } from './PuzzleState';
import { mapHasVector3 } from './Util';
import Blockly from 'blockly';
import Slider from './Slider';
import { CameraZoomIn, CameraZoomOut, CameraRotateRight, CameraRotateLeft, CameraTiltDown, CameraTiltUp } from './CameraPositioning';
import "./css/index.css"
import PuzzleManager from './PuzzleManager';
import { load_stdlib } from './Simulator';

// type PuzzleSelectProps = {
//     onClickFunction: (e: string) => void;
// }

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
            <div className="select-puzzle-buttons">
                {this.props.gameState.puzzle_manager.get_all_puzzles().map(puzzle => {return <button value={puzzle} onClick = {event => this.openPuzzle(event)}>{puzzle}</button>})}
            </div>
        )
    }
}