import React from 'react';
import ReactDOM from 'react-dom';
import App from './App'


type RunProps = {
    reset: boolean
    onClick: () => void
    // onClick: {() => this.setState({reset:true})}

    
}

//props: {reset:boolean, onClick: () => void}


export function Run(props: RunProps) {
    
    let msg = props.reset ? "Reset" : "Run Program"
    //props.reset = false <- error
    
    return (
        <button id="btn-run" onClick = {props.onClick}>
            {msg}
        </button>
    )
}

