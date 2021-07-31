import * as Blockly from 'blockly/core';

function shadeHexColor(color: string, percent: number) {
    var f = parseInt(color.slice(1), 16), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = f >> 16, G = f >> 8 & 0x00FF, B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}

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

(() => {
    Blockly.blockRendering.PathObject.prototype.applyColour = function (block) {
        if (block.frozen) {
            this.svgPath.setAttribute('stroke', shadeHexColor(this.style.colourTertiary, -0.3));
            this.svgPath.setAttribute('fill', this.style.colourPrimary);
            // var children = block.get.getSvgRoot().children;
            // for (var i = 0; i < children.length; i++) {
            //     if (children[i].nodeName === "text") {
            //         Blockly.addClass_(children[i], "blocklyFrozenText");
            //     }
            // }
        } else {
            this.svgPath.setAttribute('stroke', this.style.colourTertiary);
            this.svgPath.setAttribute('fill', this.style.colourPrimary);
        }

        this.updateShadow_(block.isShadow());
        this.updateDisabled_(!block.isEnabled() || block.getInheritedDisabled());
    };
})();