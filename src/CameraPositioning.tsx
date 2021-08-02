import React from 'react';

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
            <div style={{color: "red"}}>
                <button className="ZoomIn" onClick={this.props.onClickFunction}> Zoom In </button>
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
                <button className="Tilt" onClick={this.props.onClickFunction}> Zoom Out </button>
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
                <button className="Tilt" onClick={this.props.onClickFunction}> Tilt Camera Up </button>
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
                <button className="Tilt" onClick={this.props.onClickFunction}> Tilt Camera Down </button>
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
                <button className="RotateRight" onClick={this.props.onClickFunction}> Rotate Right </button>
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
                <button className="RotateLeft" onClick={this.props.onClickFunction}> Rotate Left </button>
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