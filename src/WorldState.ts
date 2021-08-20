/* FILENAME:    WorldState.tx
 * DESCRIPTION: 
 *      This file contains the state of Dragon Architect
 * DATE:    08/19/2021
 * AUTHOR:      Aaron Bauer    Teagan Johnson    Katrina Li
 */
import * as THREE from 'three';
import { SimCommand, RuntimeError, RuntimeErrorCode, runtime_error, 
    ValueType } from './Simulator';
/* eslint-disable */
import _ from 'lodash';
import { mapDeleteVector3, mapHasVector3 } from './Util';

export const UP = new THREE.Vector3(0, 0, 1);
export const DOWN = new THREE.Vector3(0, 0, -1);

function extract_single_int_arg(command: SimCommand): number | RuntimeError {
    if (command.args.length > 1) {
        return runtime_error(RuntimeErrorCode.CustomError, 
            `Expected 1 argument to ${command.name}`, command.meta);
    }
    if (command.args[0] && command.args[0].kind === ValueType.Number) {
        return command.args[0].val as number;
    }
    return runtime_error(RuntimeErrorCode.CustomError,
        `Expected an integer argument to ${command.name}`, command.meta);
}

export default class WorldState {
    dragon_pos: THREE.Vector3
    dragon_dir: THREE.Vector3
    // cube_map maps Vector3 positions to integers representing color
    cube_map: Map<THREE.Vector3, number>
    dirty: boolean = false;

    constructor() {
        this.dragon_pos = new THREE.Vector3(0, 0, 0);
        this.dragon_dir = new THREE.Vector3(1, 0, 0);
        this.cube_map = new Map<THREE.Vector3, number>();
    }

    mark_dirty() {
        this.dirty = true;
    }

    mark_clean() {
        this.dirty = false;
    }

    execute(command: SimCommand): void | RuntimeError {
        switch (command.name) {
            case "forward":
                this.dragon_pos.add(this.dragon_dir);
                break;
            case "up":
                this.dragon_pos.add(UP);
                break;
            case "down":
                if (this.dragon_pos.z === 0) {
                    return;  // dragon should not be able to pass below the plane, 
                             // return early here to avoid marking as dirty state that did not change
                }
                this.dragon_pos.add(DOWN);
                break;
            case "left":
                this.dragon_dir = new THREE.Vector3(-this.dragon_dir.y, 
                                                    this.dragon_dir.x,
                                                    this.dragon_dir.z);
                break;
            case "right":
                this.dragon_dir = new THREE.Vector3(this.dragon_dir.y, 
                                                    -this.dragon_dir.x,
                                                    this.dragon_dir.z);
                break;
            case "cube":
                let color_id = extract_single_int_arg(command);
                if (color_id instanceof RuntimeError) {
                    return color_id;
                }
                // only has an affect when a cube is not already present
                if (!mapHasVector3(this.cube_map, this.dragon_pos)) {
                    this.cube_map.set(this.dragon_pos.clone(), color_id);
                } else {
                    return; // return early to avoid marking dirty an unchanged state
                }
                break;
            case "remove":
                if (!mapDeleteVector3(this.cube_map, this.dragon_pos)) {
                    return; // return early to avoid marking dirty an unchanged state
                }
                break;
            default:
                return runtime_error(RuntimeErrorCode.CustomError, 
                    `Unknown command ${command.name}`, command.meta);
        }
        this.mark_dirty();
    }

    // custom serialization functions needed since JSON module can't handle Map objects
    // TODO serialization/deserialization tests

    toJSON() {
        const { cube_map, ...clone } = this;
        const temp = {
            cube_map: JSON.stringify([...cube_map]),
            ...clone
        }
        return temp;
    }

    static fromJSON(s: string): WorldState {
        const temp = JSON.parse(s);
        const ws = new WorldState();
        ws.dragon_pos = temp.dragon_pos;
        ws.dragon_dir = temp.dragon_dir;
        ws.dirty = temp.dirty;
        ws.cube_map = new Map(JSON.parse(temp.cube_map));
        return ws;
    }
}
