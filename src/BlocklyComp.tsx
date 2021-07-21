import Blockly, { mainWorkspace } from 'blockly'; //newly added mainWorkspace
import React from 'react';
import _ from 'lodash';
import parse, {
    Procedure, FileLocation, Expression,
    ExpressionType, Invocation, Meta, Ident, Program,
    SyntaxError, Statement, StatementType, Repeat, Execute, Command, TopLevelStatement
} from './Parser';
import { GameState } from './App';



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

    interface ProcedureBlock extends Block {
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
    let blocks = [];
    for (let i = 0, input; (input = this.inputList[i]); i++) {
        if (input.connection) {
            let child = input.connection.targetBlock();
            if (child) {
                blocks.push(child);
            }
        }
    }
    return blocks;
};

const KoboldConvert = new Map<string, (block: Blockly.Block) => string>();


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

    if(program.length === 0){
        return "";
    }
    //for (let s of program){
            
    switch(program[0].kind) {
        case "procedure": //block is a procedure
            let xmlPro = "";
            let pro = program[0].body;

            xmlPro = xmlHelper(pro, xmlPro);

            xmlPro = '<block type = "procedures_defnoreturn"><field name="NAME">' +program[0].name+
            '</field><statement name="STACK">' + xmlPro;
            xmlPro += '</statement></block>';
            xml = xml + xmlPro;

            break;
                
        default: // block is a statement (repeat, execute or command)
            let block = breakStmt(program[0] as Statement);
            if (block) {
                if (block.name === "Left" || block.name === "Right" || block.name === 'RemoveCube') {
                    if(program.length === 1) {
                        return '<block type="'+block.name + '"></block>';
                    }
                    xml = '<block type="'+block.name + '"><next>'+ xmlHelper(program.slice(1),"") + '</next></block>';
                }

                else if ( block.name === 'PlaceCube'){
                    let expr = block.args;
                    let color = 0;
                    if(expr[0].kind === ExpressionType.Number) { 
                        color = expr[0].expression as number;
                    }
                    
                    if(program.length === 1) {
                        return '<block type="'+block.name +'"><field name="VALUE">' + Blockly.FieldColour.COLOURS[color] + '</field></block>';
                    }
                    xml = '<block type="'+block.name + '"><field name="VALUE">' + Blockly.FieldColour.COLOURS[color] + '</field><next>'+
                    xmlHelper(program.slice(1),"") + '</next></block>';
                    
                }
                        
                else{
                    let expr = block.args;
                    if (expr[0].kind === ExpressionType.Number){ 
                        
                        if(program.length === 1) {
                            return '<block type="'+block.name +'"><value name="VALUE">' + makeShadowNum(expr[0].expression as number)+
                                '</value></block>';
                        }
                        
                        xml = '<block type="'+block.name + '"><value name="VALUE">' +  makeShadowNum(expr[0].expression as number) +
                            '</value><next>'+ xmlHelper(program.slice(1),"") + '</next></block>';
                        
                    }
                }
            }
            else{ //block is a repeat
                let xmlRep = "";
                let rep = breakStmtRep(program[0] as Statement);
                
                // xmlRep = xmlHelper([rep[rep.length-1]],"", true);//false
                
                // for(let r = rep.length-2;r>=0;r--){
                //     xmlRep = xmlHelper([rep[r]],xmlRep, true);
                //     //console.log(xml);
                // }

                xmlRep = xmlHelper(rep, xmlRep);

            
                xmlRep = '<block type="controls_repeat_ext"><value name="TIMES"><shadow type="math_number"><field name="NUM">'
                    + breakStmtRepNum(program[0] as Statement)+ '</field></shadow></value><statement name="DO">' + xmlRep;

                
                xmlRep += '</statement>';
                if(program.length > 1) {
                    xml = xml + xmlRep + '<next>' + xmlHelper(program.slice(1),"") + '</next></block>';
                }
                else{
                    xml = xml + xmlRep + '</block>';
                }


            }

    }
            
        
    
    return xml;
}

//code string to xml string
export function exportCode(code: string) {
    //currently not able to 
    //determine number of block groups
    let xml = '<xml>';
    let program = parse(code);
    if( !(program instanceof SyntaxError)) {
        xml += xmlHelper(program.body, "");
    }
    
    xml += '</xml>';
    return xml;

}

// // xml string to dom then to workspace
// export function xmlToWorkspace(xml: string) {
//     return Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xml), mainWorkspace);
// }

export function text_to_blocks(code: string) {
    let xml = exportCode(code);
    let dom = Blockly.Xml.textToDom(xml);
    let workspace = Blockly.Xml.domToWorkspace(dom, mainWorkspace);
    return workspace;
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
        console.log("top");
        print_block("", block);
    });
}



export function block_to_text(str: string, indent: string, block: Blockly.Block): string {
    let convert_fn = KoboldConvert.get(block.type);
    let children = block.getNested();
    if (convert_fn) {
        str += indent + convert_fn(block) + "\n";
    }
    if (children.length > 0) {
        for(let child of children) {
            str = block_to_text(str, (indent + "\t"), child);   
        }
    }
    if (block.getNextBlock() && convert_fn) {
        str = block_to_text(str, indent, block.getNextBlock());
    }
    return str;
}

export function blocks_to_text(): string{
    let text = "";
    let top = Blockly.getMainWorkspace().getTopBlocks(true);
    _.forEach(top, (block) => {
        text += (block_to_text("", "", block) + "\n");
        console.log(Blockly.Xml.domToText(Blockly.Xml.blockToDom(block)));
    });
    exportCode(text);
    return text;
}

// The following is just to test block(s)_to_text.
// To test if blocks_to_text() work, uncomment it
// and comment the original print_blocks() in line 69
//
// export function print_blocks(){ 
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
    move2: { block: '<block type="Forward"><value name="VALUE">' + makeShadowNum(1) + '</value></block><block type="Left"></block><block type="Right"></block>' },
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
            this.setColour(COLOR_MOVE_1);
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

export default class BlocklyComp extends React.Component<GameState> {
    constructor(props: GameState) {
        super(props);
        customBlocklyInit();
    }

    render() {
        return (
            <div id="blocklyDiv" style={{ width: '100%' }}></div>
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