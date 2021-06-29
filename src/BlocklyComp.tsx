import Blockly from 'blockly';
import React from 'react';

export default class BlocklyComp extends React.Component {
    render() {
        return (
            <div id="blocklyDiv" style={{height: '480px', width: '600px'}}></div>
        )
    }

    componentDidMount() {
        Blockly.inject('blocklyDiv',
            { toolbox: document.getElementById('toolbox')! });
    }
}