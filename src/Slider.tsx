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
            <div style={{color: "red", direction: "rtl"}}>
                <h1>Slider</h1>
                <input type="range" min={0.01} max={2} step={0.01} className="slider" onChange={this.props.onChange} />
            </div>
        );
    };
};