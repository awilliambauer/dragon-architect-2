import Blockly, { mainWorkspace } from 'blockly'; //newly added mainWorkspace
import React from 'react';
import _ from 'lodash';
import parse, {
    ExpressionType,
    SyntaxError, Statement, StatementType, Repeat, Execute, Command, TopLevelStatement
} from './Parser';
import { GameState } from './App';
import './BlocklyExtensions';

const COLOR_MOVE_1 = '#0075A6';
const COLOR_MOVE_2 = '#B84B26';
const COLOR_BLOCK = '#978B63';
const skip_blocks = ["math_number"];
// const COLOR_LOOPS = '#00711C';
// const COLOR_UNUSED_1 = '#B63551';
// const COLOR_UNUSED_2 = '#A88217';
// Blockly.FieldColour.COLOURS

// class KoboldLangOps {
//     block_to_kobold: Map<string, ()>
// }

// var restricted_list = ["remove","repeat","defproc"];


const KoboldConvert = new Map<string, (block: Blockly.Block) => string>();

// const allGranted = ['move2', 'place', 'remove', 'up', 'down', 'repeat', 'defproc'];

// little helper functions for the recursive xmlHelper() function
export function breakStmt(stmt: Statement) {
    switch (stmt.kind) {
        case StatementType.Command:
            let command = stmt.stmt as Command;
            return command.invoke;

        case StatementType.Execute:
            let exec = stmt.stmt as Execute;
            return exec.invoke;

        default:
            return null;
    }
}
export function breakStmtRep(stmt: Statement) {
    let rep = stmt.stmt as Repeat;
    return rep.body;
}
export function breakStmtRepNum(stmt: Statement) {
    let rep = stmt.stmt as Repeat;
    return rep.number.expression;
}


// a recursive function that turns parsed code strings to a huge xml string
export function xmlHelper(program: TopLevelStatement[] | Statement[], xml: string) {

    if (program.length === 0) {
        return "";
    }
    //for (let s of program){

    switch (program[0].kind) {
        case "procedure": //block is a procedure
            let xmlPro = "";
            let pro = program[0].body;

            xmlPro = xmlHelper(pro, xmlPro);

            xmlPro = '<block type = "procedures_defnoreturn"><field name="NAME">' + program[0].name +
                '</field><statement name="STACK">' + xmlPro;
            xmlPro += '</statement></block>';
            xml = xml + xmlPro;

            break;

        default: // block is a statement (repeat, execute or command)
            let block = breakStmt(program[0] as Statement);
            if (block) {
                if (block.name === "Left" || block.name === "Right" || block.name === 'RemoveCube') {
                    if (program.length === 1) {
                        return '<block type="' + block.name + '"></block>';
                    }
                    xml = '<block type="' + block.name + '"><next>' + xmlHelper(program.slice(1), "") + '</next></block>';
                }

                else if (block.name === 'PlaceCube') {
                    let expr = block.args;
                    let color = 0;
                    if (expr[0].kind === ExpressionType.Number) {
                        color = expr[0].expression as number;
                    }

                    if (program.length === 1) {
                        return '<block type="' + block.name + '"><field name="VALUE">' + Blockly.FieldColour.COLOURS[color] + '</field></block>';
                    }
                    xml = '<block type="' + block.name + '"><field name="VALUE">' + Blockly.FieldColour.COLOURS[color] + '</field><next>' +
                        xmlHelper(program.slice(1), "") + '</next></block>';

                }

                else {
                    let expr = block.args;
                    if (expr[0].kind === ExpressionType.Number) {

                        if (program.length === 1) {
                            return '<block type="' + block.name + '"><value name="VALUE">' + makeShadowNum(expr[0].expression as number) +
                                '</value></block>';
                        }

                        xml = '<block type="' + block.name + '"><value name="VALUE">' + makeShadowNum(expr[0].expression as number) +
                            '</value><next>' + xmlHelper(program.slice(1), "") + '</next></block>';

                    }
                }
            }
            else { //block is a repeat
                let xmlRep = "";
                let rep = breakStmtRep(program[0] as Statement);

                // xmlRep = xmlHelper([rep[rep.length-1]],"", true);//false

                // for(let r = rep.length-2;r>=0;r--){
                //     xmlRep = xmlHelper([rep[r]],xmlRep, true);
                //     //console.log(xml);
                // }

                xmlRep = xmlHelper(rep, xmlRep);


                xmlRep = '<block type="controls_repeat_ext"><value name="TIMES"><shadow type="math_number"><field name="NUM">'
                    + breakStmtRepNum(program[0] as Statement) + '</field></shadow></value><statement name="DO">' + xmlRep;


                xmlRep += '</statement>';
                if (program.length > 1) {
                    xml = xml + xmlRep + '<next>' + xmlHelper(program.slice(1), "") + '</next></block>';
                }
                else {
                    xml = xml + xmlRep + '</block>';
                }


            }

    }



    return xml;
}

export function text_to_blocks(code: string) {
    let xml = '<xml>';
    let program = parse(code);
    if (program instanceof SyntaxError) {
        console.error(`Syntax Error: ${program}`);
    } else {
        xml += xmlHelper(program.body, "");
        xml += '</xml>';
        let dom = Blockly.Xml.textToDom(xml);
        Blockly.getMainWorkspace().clear();
        Blockly.Xml.domToWorkspace(dom, mainWorkspace);
        //(program.body[0].meta.attributes.get("frozen"));
        if (program.body[0].meta.attributes.get("frozen") === "all") {
            freeze_all_blocks(program.body[0].meta.attributes.has("freezeArgs"));
        }
    }
}

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
        //console.log("top");
        print_block("", block);
    });
}



export function block_to_text(str: string, indent: string, block: Blockly.Block): string {
    let convert_fn = KoboldConvert.get(block.type);
    let children = block.getNested();
    if (convert_fn) {
        str += indent + convert_fn(block) + "\n";
    } else if (!KoboldConvert.has(block.type) && !skip_blocks.includes(block.type)) {
        console.error(`No KoboldConvert function found for ${block.type}`);
    }
    if (children.length > 0) {
        for (let child of children) {
            str = block_to_text(str, (indent + "\t"), child);
        }
    }
    if (block.getNextBlock() && convert_fn) {
        str = block_to_text(str, indent, block.getNextBlock());
    }
    return str;
}

export function blocks_to_text(): string {
    let text = "";
    let top = Blockly.getMainWorkspace().getTopBlocks(true);
    _.forEach(top, (block) => {
        text += (block_to_text("", "", block) + "\n");
    });
    return text;
}

// return a new hex color string that lightens (positive) or darkens (negative) the 
// original color by `percent` (`percent` should be between 0 and 1)
// from: https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)#stackoverflow-archive-begin
function shade_hex_color(color: string, percent: number) {
    var f = parseInt(color.slice(1), 16), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = f >> 16, G = (f >> 8) & 0x00FF, B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}

function freeze_stack(block: Blockly.Block, freeze_args: boolean) {
    block.setMovable(false);
    block.setDeletable(false);
    block.setColour(shade_hex_color(block.getColour(), -0.5));
    if (freeze_args) {
        block.setEditable(false);
    }
    if (block.getNextBlock()) {
        freeze_stack(block.getNextBlock(), freeze_args);
    }
}

function freeze_all_blocks(freeze_args: boolean) {
    let top = Blockly.getMainWorkspace().getTopBlocks(true);
    _.forEach(top, block => freeze_stack(block, freeze_args));
}


function makeShadowNum(num: number, id?: string) {
    if (id) {
        return '<shadow type="math_number" id="' + id + '"><field name="NUM">' + num + '</field></shadow>';
    }
    return '<shadow type="math_number"><field name="NUM">' + num + '</field></shadow>';
};


const COMMANDS = {
    move2: { block: '<block type="Forward"><value name="VALUE">' + makeShadowNum(1) + '</value></block><block type="Left"></block><block type="Right"></block>' },
    //set: { block: '<block type="Set"><value name="VALUE">' + makeShadowNum(1) + '</value></block>' },
    place: { block: '<block type="PlaceCube"></block>' },
    remove: { block: '<block type="RemoveCube"></block>', teaser: '<block type="RemoveCube_teaser"></block>', pack: 'remove' },
    up: { block: '<block type="Up"><value name="VALUE">' + makeShadowNum(1) + '</value></block>', teaser: '<block type="Up_teaser"><value name="VALUE">' + makeShadowNum(1) + '</value></block>', pack: 'up' },
    down: { block: '<block type="Down"><value name="VALUE">' + makeShadowNum(1) + '</value></block>', teaser: '<block type="Down_teaser"><value name="VALUE">' + makeShadowNum(1) + '</value></block>', pack: 'up' },
    repeat: {
        block: '<block type="controls_repeat_ext"><value name="TIMES">' + makeShadowNum(10) + '</value></block>',
        teaser: '<block type="controls_repeat_teaser"><value name="TIMES">' + makeShadowNum(10) + '</value></block>', pack: 'repeat'
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
    Blockly.FieldColour.COLOURS = ["#1ca84f", "#a870b7", "#ff1a6d", "#00bcf4", "#ffc911", "#ff6e3d", "#000000", "#ffffff"];

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
                colour: COLOR_MOVE_2
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
                colour: COLOR_MOVE_2
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
        return `Forward(${block.getInput("VALUE")?.connection?.targetBlock()?.getFieldValue("NUM")})`
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
            this.setColour(COLOR_BLOCK);
            this.appendDummyInput()
                .appendField("place cube")
                .appendField(new Blockly.FieldColour(Blockly.FieldColour.COLOURS[0]), 'VALUE');
            this.setPreviousStatement(true);
            this.setNextStatement(true);
        }
    };
    KoboldConvert.set("PlaceCube", (block: Blockly.Block) => {
        return `PlaceCube(` + Blockly.FieldColour.COLOURS.indexOf(block.getFieldValue("VALUE")) + `)`
        // this will be an integer
    });

    //removecube
    Blockly.Blocks['RemoveCube'] = {
        init: function (this: Blockly.Block) {
            this.setColour(COLOR_BLOCK);
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
        let [name, args] = (block as Blockly.ProcedureBlock).getProcedureDef();
        return `define ${name}(${args})`;
    });

    KoboldConvert.set("procedures_callnoreturn", (block: Blockly.Block) => {
        return `${block.getFieldValue("NAME")}()`;
    });
}

export default class BlocklyComp extends React.Component<GameState & {granted_blocks: string[]}> {
    workspace?: Blockly.WorkspaceSvg

    constructor(props: GameState & { granted_blocks: string[] }) {
        super(props);
        customBlocklyInit();

    }


    render() {

        return (
            <div id="blocklyDiv" style={{ width: '100%' }}></div>
            
        )
    }

    componentDidMount() {
        this.workspace = Blockly.inject('blocklyDiv',
            { toolbox: document.getElementById('toolbox')!, renderer: 'thrasos' });
        this.updateToolbox(this.workspace, []); // the initial toolbox, empty but we can add any block here
    }

    componentDidUpdate() {
        if (this.workspace) {
            this.updateToolbox(this.workspace, this.props.granted_blocks);
        }
    }

    updateToolbox(workspace: Blockly.WorkspaceSvg, granted_blocks: string[]) {
        let toolXML = '<xml id="toolbox" style="display: none">';
        // console.log("updating toolbox: this.props.grantedBlocks = " + granted_blocks);
        _.forEach(COMMANDS, (data, name) => {

            if (!_.includes(this.props.puzzle?.library.restricted, name) && _.includes(granted_blocks, name)) {
                toolXML += data.block;
            }
        });

        toolXML += '</xml>';

        workspace.updateToolbox(toolXML);

    }
}