import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Type that holds all methods that are passed in. Each one has a question mark in case it's not called
type CameraVals = {
    onClickFunction: (e: React.MouseEvent<HTMLElement>) => void
}

// Creates button for zooming in
class CameraZoomIn extends React.Component<CameraVals> {
    constructor(props: CameraVals) {
        super(props);
    }
    
    render() {
        return (
            <div>
                <button className="ZoomIn" onClick={this.props.onClickFunction}><h1><FontAwesomeIcon icon="search-plus" style={{color: 'white'}}/></h1></button>
            </div>
        );
    };
};

// Creates button for zooming out
class CameraZoomOut extends React.Component<CameraVals> {
    constructor(props: CameraVals) {
        super(props);
    }

    render() {
        return (
            <div style={{color: "red"}}>
                <button className="ZoomOut" onClick={this.props.onClickFunction}> <h1><FontAwesomeIcon icon="search-minus" style={{color: 'white'}}/></h1></button>
            </div>
        );
    };
};

// Creates button for tilting up
class CameraTiltUp extends React.Component<CameraVals> {
    constructor(props: CameraVals) {
        super(props);
    }
    
    render() {
        return (
            <div style={{color: "red"}}>
                <button className="TiltUp" onClick={this.props.onClickFunction}><h1><FontAwesomeIcon icon="arrow-up" style={{color: 'white'}}/></h1></button>
            </div>
        );
    };
};

// Creates button for tilting down
class CameraTiltDown extends React.Component<CameraVals> {
    constructor(props: CameraVals) {
        super(props);
    }

    render() {
        return (
            <div style={{color: "red"}}>
                <button className="TiltDown" onClick={this.props.onClickFunction}><h1><FontAwesomeIcon icon="arrow-down" style={{color: 'white'}}/></h1></button>
            </div>
        );
    };
};


// Creates button for rotating right
class CameraRotateRight extends React.Component<CameraVals> {
    constructor(props: CameraVals) {
        super(props);
    }

    render() {
        return (
            <div style={{color: "red"}}>
                <button className="RotateRight" onClick={this.props.onClickFunction}><h1><FontAwesomeIcon icon="redo" style={{color: 'white'}}/></h1></button>
            </div>
        );
    };
};

// Creates button for rotating left
class CameraRotateLeft extends React.Component<CameraVals> {
    constructor(props: CameraVals) {
        super(props);
    }

    render() {
        return (
            <div style={{color: "red"}}>
                <button className="RotateLeft" onClick={this.props.onClickFunction}><h1><FontAwesomeIcon icon="undo" style={{color: 'white'}}/></h1></button>
            </div>
        );
    };
};

export {
    CameraZoomIn,
    CameraZoomOut,
    CameraRotateRight,
    CameraRotateLeft,
    CameraTiltUp,
    CameraTiltDown
}