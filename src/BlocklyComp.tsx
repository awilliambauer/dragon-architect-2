import Blockly from 'blockly';
import React from 'react';
import _ from 'lodash';

const COLOR_MOVE_1 = '#0075A6';
// const COLOR_MOVE_2 = '#B84B26';
// const COLOR_BLOCK = '#978B63';
// const COLOR_LOOPS = '#00711C';
const COLOR_PROCS = '#7C478B';
// const COLOR_UNUSED_1 = '#B63551';
// const COLOR_UNUSED_2 = '#A88217';
// const COLOR_TEASER = '#707070';
// Blockly.FieldColour.COLOURS

// class KoboldLangOps {
//     block_to_kobold: Map<string, ()>
// }



declare module "blockly" {
    interface Block {
        getNested(): Blockly.Block[]
    }

    interface ProcedureBlock extends Block{
        /**
         * Return the signature of this procedure definition.
         * @return {!Array} Tuple containing three elements:
         *     - (string) the name of the defined procedure,
         *     - (Array) a list of all its arguments,
         *     - (boolean) that it DOES have a return value.
         * @this {Blockly.Block}
         */
        getProcedureDef(): [string, string[], boolean]
    }
}

Blockly.Block.prototype.getNested = function () {
    var blocks = [];
    for (var i = 0, input; (input = this.inputList[i]); i++) {
        if (input.connection) {
            var child = input.connection.targetBlock();
            if (child) {
                blocks.push(child);
            }
        }
    }
    return blocks;
};

const KoboldConvert = new Map<string, (block: Blockly.Block) => string>();

function print_block(indent: string, block: Blockly.Block) {
    let convert_fn = KoboldConvert.get(block.type);
    if (convert_fn) {
        console.log(indent + convert_fn(block));
    }
    let children = block.getNested();
    if (children.length > 0) {
        // console.log(indent + `children:`);
        _.forEach(children, _.partial(print_block, indent + "\t"));
    }
    if (block.getNextBlock()) {
        print_block(indent, block.getNextBlock());
    }
}

export function print_blocks() {
    let top = Blockly.getMainWorkspace().getTopBlocks(true);
    _.forEach(top, (block) => {
        console.log("top");
        print_block("", block);
    });
}

export function block_to_text(str: string, indent: string, block: Blockly.Block): string{
    let convert_fn = KoboldConvert.get(block.type);
    let children = block.getNested();
    if(convert_fn){
        str += indent + convert_fn(block) + "\n";
    }
    if (children.length > 0) {
        for(var child of children){
            str = block_to_text(str, (indent+"\t"), child);   
        }
    }
    if (block.getNextBlock() && convert_fn) {
        str = block_to_text(str, indent, block.getNextBlock());
    }
    return str;
}

export function blocks_to_text(): string{
    var text = "";
    let top = Blockly.getMainWorkspace().getTopBlocks(true);
    _.forEach(top, (block) =>{
        text += (block_to_text("","", block) + "\n");
    });
    return text;
}
// export function print_blocks(){ //just to test block(s)_to_text
//     let top = Blockly.getMainWorkspace().getTopBlocks(true);
//     _.forEach(top, (block) =>{
//         console.log(blocks_to_text());
//     });
// }

function makeShadowNum(num: number, id?: string) {
    if (id) {
        return '<shadow type="math_number" id="' + id + '"><field name="NUM">' + num + '</field></shadow>';
    }
    return '<shadow type="math_number"><field name="NUM">' + num + '</field></shadow>';
};

const COMMANDS = {
    move2: { block: '<block type="Forward"><value name="VALUE">' + makeShadowNum(1) + '</value></block>' },
    //set: { block: '<block type="Set"><value name="VALUE">' + makeShadowNum(1) + '</value></block>' },
    place: { block: '<block type="PlaceCube"></block>' },
    remove: { block: '<block type="RemoveCube"></block>', teaser: '<block type="RemoveCube_teaser"></block>', pack: 'remove' },
    up: { block: '<block type="Up"><value name="VALUE">' + makeShadowNum(1) + '</value></block>', teaser: '<block type="Up_teaser"><value name="VALUE">' + makeShadowNum(1) + '</value></block>', pack: 'up' },
    down: { block: '<block type="Down"><value name="VALUE">' + makeShadowNum(1) + '</value></block>', teaser: '<block type="Down_teaser"><value name="VALUE">' + makeShadowNum(1) + '</value></block>', pack: 'up' },
    repeat: {
        block: '<block type="controls_repeat_ext"><value name="TIMES">' + makeShadowNum(10) + '</value></block>',
        // teaser: '<block type="controls_repeat_teaser"><value name="TIMES">' + makeShadowNum(10) + '</value></block>', pack: 'repeat'
    },
    // counting_loop: {
    //     block: '<block type="controls_for"><value name="COUNTER"><block type="variables_get" default="true"><field name="VAR">i</field></block></value>' +
    //         '<value name="FROM">' + makeShadowNum(0) + '</value>' +
    //         '<value name="TO">' + makeShadowNum(10) + '</value>' +
    //         '<value name="BY">' + makeShadowNum(1) + '</value>' +
    //         '</block>'
    // },
    // defproc_noargs: { block: '<block type="procedures_noargs_defnoreturn"></block>', teaser: '<block type="procedures_defnoreturn_teaser"></block>', pack: 'procedures' },
    // defproc: { block: '<block type="procedures_defnoreturn"></block>', teaser: '<block type="procedures_defnoreturn_teaser"></block>', pack: 'procedures' },
    defproc: { block: '<block type="procedures_defnoreturn"></block>', pack: 'procedures' },


};


function customBlocklyInit() {

    //up
    Blockly.Blocks['Up'] = {
        init: function (this: Blockly.Block) {
            this.jsonInit({
                message0: "up by %1",
                args0: [
                    {
                        type: "input_value",
                        name: "VALUE",
                        check: "Number"
                    }
                ],
                previousStatement: true,
                nextStatement: true,
                inputsInline: true,
                colour: COLOR_MOVE_1
            });
        }
    };
    KoboldConvert.set("Up", (block: Blockly.Block) => {
        return `Up(${block.getInput("VALUE")?.connection?.targetBlock()?.getFieldValue("NUM")})`
    });

    //down
    Blockly.Blocks['Down'] = {
        init: function (this: Blockly.Block) {
            this.jsonInit({
                message0: "down by %1",
                args0: [
                    {
                        type: "input_value",
                        name: "VALUE",
                        check: "Number"
                    }
                ],
                previousStatement: true,
                nextStatement: true,
                inputsInline: true,
                colour: COLOR_MOVE_1
            });
        }
    };
    KoboldConvert.set("Down", (block: Blockly.Block) => {
        return `Down(${block.getInput("VALUE")?.connection?.targetBlock()?.getFieldValue("NUM")})`
    });

    //forward
    Blockly.Blocks['Forward'] = {
        init: function (this: Blockly.Block) {
            this.jsonInit({
                message0: "forward by %1",
                args0: [
                    {
                        type: "input_value",
                        name: "VALUE",
                        check: "Number"
                    }
                ],
                previousStatement: true,
                nextStatement: true,
                inputsInline: true,
                colour: COLOR_MOVE_1
            });
        }
    };
    KoboldConvert.set("Forward", (block: Blockly.Block) => {
        return `Foward(${block.getInput("VALUE")?.connection?.targetBlock()?.getFieldValue("NUM")})`
    });

    //left
    Blockly.Blocks['Left'] = {
        init: function (this: Blockly.Block) {
            this.setColour(COLOR_MOVE_1);
            this.appendDummyInput()
                .appendField("turn left");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
        }
    };
    KoboldConvert.set("Left", (block: Blockly.Block) => {
        return `Left()`
    });

    //right
    Blockly.Blocks['Right'] = {
        init: function (this: Blockly.Block) {
            this.setColour(COLOR_MOVE_1);
            this.appendDummyInput()
                .appendField("turn right");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
        }
    };
    KoboldConvert.set("Right", (block: Blockly.Block) => {
        return `Right()`
    });

    //placecube
    Blockly.Blocks['PlaceCube'] = {
        init: function (this: Blockly.Block) {
            this.setColour(COLOR_MOVE_1);
            this.appendDummyInput()
                .appendField("place cube")
                .appendField(new Blockly.FieldColour(Blockly.FieldColour.COLOURS[0]), 'VALUE');
            this.setPreviousStatement(true);
            this.setNextStatement(true);
        }
    };
    KoboldConvert.set("PlaceCube", (block: Blockly.Block) => {
        return `PlaceCube(`+Blockly.FieldColour.COLOURS.indexOf(block.getFieldValue("VALUE"))+`)`
        // this will be an integer
    });

    //removecube
    Blockly.Blocks['RemoveCube'] = {
        init: function (this: Blockly.Block) {
            this.setColour(COLOR_MOVE_1);
            this.appendDummyInput()
                .appendField("remove cube");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
        }
    };
    KoboldConvert.set("RemoveCube", (block: Blockly.Block) => {
        return `RemoveCube()`
    });

    //repeat (built-in)
    KoboldConvert.set("controls_repeat_ext", (block: Blockly.Block) => {
        return `repeat ${block.getInput("TIMES")?.connection?.targetBlock()?.getFieldValue("NUM")} times`;
    });

    //procedure (built-in)
    KoboldConvert.set("procedures_defnoreturn", (block: Blockly.Block) => {
        let [name, args, _hasReturn] = (block as Blockly.ProcedureBlock).getProcedureDef();
        return `define ${name}(${args})`;
    });
}

export default class BlocklyComp extends React.Component {
    constructor() {
        super({});
        customBlocklyInit();
    }

    render() {
        return (
            <div id="blocklyDiv" style={{height: '480px', width: '600px'}}></div>
        )
    }

    componentDidMount() {
        let ws = Blockly.inject('blocklyDiv',
            { toolbox: document.getElementById('toolbox')! });
        this.updateToolbox(ws);
    }

    updateToolbox(workspace: Blockly.WorkspaceSvg) {
        let toolXML = '<xml id="toolbox" style="display: none">';

        // add each block from COMMANDS to the toolbox
        _.forEach(COMMANDS, function (data, _name) {
                toolXML += data.block;
        });
        toolXML += '</xml>';
        workspace.updateToolbox(toolXML);
    }
}