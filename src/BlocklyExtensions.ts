/* FILENAME:    BlocklyExtensions.ts
 * DESCRIPTION: 
 *      This file defines and customizes the block interface that would be used in blocklycomps
 * DATE:    08/19/2021
 * AUTHOR:      Aaron Bauer
 */
import * as Blockly from 'blockly/core';

declare module "blockly" {
    interface Block {
        getNested(): Blockly.Block[]
        frozen: boolean
        freeze(doFreezeArgs: boolean): void
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

/**
 * Makes a block unmoveable, undeletetable, and disables its context menu
 * May make any fields on the block uneditable
 * IF YOU CALL THIS, YOU MUST SUBSEQUENTLY CALL <Block>.updateColour TO GET THE CORRECT COLORS
 */
Blockly.Block.prototype.freeze = function (doFreezeArgs: boolean) {
    this.frozen = true;

    this.setMovable(false);
    this.setDeletable(false);
    this.contextMenu = false;
    if (doFreezeArgs) {
        this.setEditable(false);
    }

    // check for inline input that needs to be frozen
    if (this.inputsInline) {
        var inputs = this.inputList.filter(function (input) { return input.type === Blockly.INPUT_VALUE; });
        inputs.forEach(function (input) { input.connection.targetBlock().freeze(doFreezeArgs); });
    }
};
