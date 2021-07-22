import React, { ChangeEventHandler } from 'react';
import * as THREE from 'three';
import { GameState } from './App';
import { Material } from 'three';
import { GoalInfo, GoalInfoType } from './PuzzleState';
import Blockly from 'blockly';
import mainStuff from 'three';
import styled from 'styled-components';

const Styles = styled.div`

`;

type SliderState = {
    value: number
}

export default class Slider extends React.Component<GameState, SliderState> {
    divRef: React.RefObject<HTMLDivElement>;
    handleOnChange: ChangeEventHandler<HTMLInputElement> | undefined;
    constructor(props: GameState) {
        super(props);
        this.state = {
            value: 50
        };
        this.divRef = React.createRef();
    }
    componentDidMount() {
        // this.divRef.current?.appendChild(mainStuff.renderer.domElement);
    }
    render() {
        return (
            <Styles>
                <input type="range" min={0} max={5} value={this.state.value} className="slider" onChange={this.handleOnChange} />
                <div className="value" ref={this.divRef}>This is the value: {this.state.value}</div>
            </Styles>
        );
    };
    onChange() {
        // const newVal = forceNumber(e.target.value);
        // this.setState({value: newVal});
    }
};