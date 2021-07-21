import React from 'react';
import ReactDOM from 'react-dom';
import GameState from './app';

type RunProps = {
    reset: boolean
    onClick: () => void
    
}

//props: {reset:boolean, onClick: () => void}


export function Run(props: RunProps) {
    let msg = props.reset ? "Reset" : "Run Program"
    return (
        <button id="btn-run" onClick = {props.onClick}>
            {msg}
        </button>
    )
}

