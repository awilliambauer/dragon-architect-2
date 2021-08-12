import React, { ChangeEventHandler } from 'react';
import * as THREE from 'three';
import { GameState } from './App';
import { Material } from 'three';
import { GoalInfo, GoalInfoType } from './PuzzleState';
import Blockly from 'blockly';
import mainStuff from 'three';
import styled from 'styled-components';
import Display from './Display';



type SliderVals = {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default class Slider extends React.Component<SliderVals> {
    constructor(props: SliderVals) {
        super(props);
    }

    render() {
        return (
<<<<<<< Updated upstream
            <div className="slider-container" style={{ color: "black", direction: "rtl" }}>
                <div className="slider-buttons-container">
                    <div className="slider-left-header">
                        <h6>Fast</h6>
                    </div>
                    <input type="range" min={0.01} max={2} step={0.01} className="slider" onChange={this.props.onChange} />
                    <div className="slider-right-header">
                        <h6>Slow</h6>
                    </div>
                </div>
=======
            <div style={{color: "black", direction: "rtl"}}>
                <h1>Change Speed</h1>
                <input type="range" min={0.01} max={2} step={0.01} className="slider" onChange={this.props.onChange} />
>>>>>>> Stashed changes
            </div>
        );
    };
};