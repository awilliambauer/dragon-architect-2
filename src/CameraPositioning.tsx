/* FILENAME:    CameraPositioning.tsx
 * DESCRIPTION: 
 *      This file contains the camera control functions.
 *      The 6 camera control functions are contained in this file and used in Display.tsx.
 *      Child of Display.tsx
 * DATE:    08/19/2021
 * AUTHOR:      Teagan Johnson   Aaron Bauer    Katrina Li
 */
import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Type that holds all methods that are passed in. Each one has a question mark in case it's not called
type CameraVals = {
    onClickFunction: (e: React.MouseEvent<HTMLElement>) => void;
}

// Creates button for zooming in
function CameraZoomIn(props: CameraVals) {
    return (
        <div>
            <button className="ZoomIn" onClick={props.onClickFunction}><h1><FontAwesomeIcon icon="search-plus" style={{ color: 'white' }} /></h1></button>
        </div>
    );
};

// Creates button for zooming out
function CameraZoomOut(props: CameraVals) {
    return (
        <div>
            <button className="ZoomOut" onClick={props.onClickFunction}> <h1><FontAwesomeIcon icon="search-minus" style={{ color: 'white' }} /></h1></button>
        </div>
    );
};

// Creates button for tilting up
function CameraTiltUp(props: CameraVals) {
    return (
        <div>
            <button className="TiltUp" onClick={props.onClickFunction}><h1><FontAwesomeIcon icon="arrow-up" style={{ color: 'white' }} /></h1></button>
        </div>
    );
};

// Creates button for tilting down
function CameraTiltDown(props: CameraVals) {
    return (
        <div>
            <button className="TiltDown" onClick={props.onClickFunction}><h1><FontAwesomeIcon icon="arrow-down" style={{ color: 'white' }} /></h1></button>
        </div>
    );
};


// Creates button for rotating right
function CameraRotateRight(props:CameraVals) {
    return (
        <div>
            <button className="RotateRight" onClick={props.onClickFunction}><h1><FontAwesomeIcon icon="redo" style={{ color: 'white' }} /></h1></button>
        </div>
    );
};

// Creates button for rotating left
function CameraRotateLeft(props: CameraVals) {
    return (
        <div>
            <button className="RotateLeft" onClick={props.onClickFunction}><h1><FontAwesomeIcon icon="undo" style={{ color: 'white' }} /></h1></button>
        </div>
    );

};

export {
    CameraZoomIn,
    CameraZoomOut,
    CameraRotateRight,
    CameraRotateLeft,
    CameraTiltUp,
    CameraTiltDown
}