/* FILENAME:    Slider.tsx
 * DESCRIPTION: 
 *      This file contains the slider range that is used to control dragon speed.
 *      Child of Display.tsx
 * DATE:    08/19/2021
 * AUTHOR:      Teagan Johnson   Aaron Bauer    Katrina Li
 */
import React from 'react';

type SliderVals = {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default class Slider extends React.Component<SliderVals> {
    render() {
        return (
            <div className="slider-container">
                <div className="slider-buttons-container">
                    <div className="slider-left-header">
                        <h6>Fast</h6>
                    </div>
                    <input type="range" min={0.01} max={2} step={0.01} className="slider" onChange={this.props.onChange} />
                    <div className="slider-right-header">
                        <h6>Slow</h6>
                    </div>
                </div>
            </div>
        );
    };
};