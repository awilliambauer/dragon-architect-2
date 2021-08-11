import React, { ButtonHTMLAttributes, ChangeEvent, DetailedHTMLProps } from 'react';
import * as THREE from 'three';
import { GameState } from './App';
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


export default class PuzzleSelect extends React.Component<GameState> {
    
    constructor(props: GameState) {
        super(props);
        load_stdlib();
    }



    render() {
        return (
            <div>
                <select name="puzzle-select" id="puzzle-select" className='puzzle-select'>
                {this.props.puzzle_manager.get_all_puzzles().map(puzzle => <option key={puzzle} value={puzzle}>{puzzle}</option>)}
              </select>
            </div>
        )
    }
}