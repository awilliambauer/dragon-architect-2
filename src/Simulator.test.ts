import run, { load_stdlib, baseline_environment, RuntimeError } from "./Simulator";
import parse, { Program, SyntaxError } from './Parser';
import WorldState, { UP } from './WorldState';
import _ from 'lodash';
import * as THREE from 'three';


test("load-stdlib", () => {
    expect(baseline_environment === null).toBe(true);
    load_stdlib();
    expect(baseline_environment === null).toBe(false);
    expect(baseline_environment?.procedures.size).toBe(7);
    expect(baseline_environment?.values.size).toBe(0);
});

test("empty", () => {
    load_stdlib();
    let prog = parse("");
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false)
    expect(_.isEqual(ws, new WorldState())).toBe(true);
});

test("stdlib-Forward", () => {
    load_stdlib();
    let prog = parse("Forward(5)");
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    let ws_expected = new WorldState();
    ws_expected.dragon_pos.add(ws_expected.dragon_dir.clone().multiplyScalar(5));
    ws_expected.dirty = true;
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});

test("stdlib-Forward1M", () => {
    load_stdlib();
    let prog = parse("Forward(1000000)");
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    let ws_expected = new WorldState();
    ws_expected.dragon_pos.add(ws_expected.dragon_dir.clone().multiplyScalar(1000000));
    ws_expected.dirty = true;
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});

test("stdlib-Up", () => {
    load_stdlib();
    let prog = parse("Up(5)");
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    let ws_expected = new WorldState();
    ws_expected.dragon_pos.add(UP.clone().multiplyScalar(5));
    ws_expected.dirty = true;
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});

test("stdlib-Down", () => {
    load_stdlib();
    let prog = parse("Down(5)");
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    let ws_expected = new WorldState();
    
    // don't go through the floor
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    expect(_.isEqual(ws, ws_expected)).toBe(true);
    
    // but do go down
    ws.dragon_pos = new THREE.Vector3(0, 0, 10);
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    ws_expected.dragon_pos = new THREE.Vector3(0, 0, 5);
    ws_expected.dirty = true;
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});

test("stdlib-Left", () => {
    load_stdlib();
    let prog = parse("Left()");
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    let ws_expected = new WorldState();
    ws_expected.dragon_dir = new THREE.Vector3(-ws_expected.dragon_dir.y, ws_expected.dragon_dir.x, ws_expected.dragon_dir.z);
    ws_expected.dirty = true;
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});

test("stdlib-Right", () => {
    load_stdlib();
    let prog = parse("Right()");
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    let ws_expected = new WorldState();
    ws_expected.dragon_dir = new THREE.Vector3(ws_expected.dragon_dir.y, -ws_expected.dragon_dir.x, ws_expected.dragon_dir.z);
    ws_expected.dirty = true;
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});

test("stdlib-PlaceCube", () => {
    load_stdlib();
    let prog = parse("PlaceCube(0)");
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    let ws_expected = new WorldState();
    ws_expected.cube_map.set(new THREE.Vector3(), 0);
    ws_expected.dirty = true;
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});

test("stdlib-RemoveCube", () => {
    load_stdlib();
    let prog = parse("RemoveCube()");
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    let ws_expected = new WorldState();
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    expect(_.isEqual(ws, ws_expected)).toBe(true);
    ws_expected.dirty = true;
    ws.cube_map.set(ws.dragon_pos, 0);
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});

test("stdlib-Square", () => {
    load_stdlib();
    let prog = parse(`
# make a 3x3 square
repeat 4 times
    repeat 2 times
        PlaceCube(0)
        Forward(1)
    Right()
`);
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    let ws_expected = new WorldState();
    ws_expected.dirty = true;
    ws_expected.cube_map.set(new THREE.Vector3(0, 0, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(1, 0, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, 0, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, -1, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, -2, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(1, -2, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, -2, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, -1, 0), 0);
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    // console.log(JSON.stringify(ws, null, 2));
    // console.log(JSON.stringify(ws_expected, null, 2));
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});

test("stdlib-Tower", () => {
    load_stdlib();
    let prog = parse(`
define Square()
    repeat 4 times
        repeat 2 times
            PlaceCube(0)
            Forward(1)
        Right()
repeat 3 times
    Square()
    Up(1)
`);
    expect(prog instanceof SyntaxError).toBe(false);
    let ws = new WorldState();
    let ws_expected = new WorldState();
    ws_expected.dirty = true;
    ws_expected.cube_map.set(new THREE.Vector3(0, 0, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(1, 0, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, 0, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, -1, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, -2, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(1, -2, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, -2, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, -1, 0), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, 0, 1), 0);
    ws_expected.cube_map.set(new THREE.Vector3(1, 0, 1), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, 0, 1), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, -1, 1), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, -2, 1), 0);
    ws_expected.cube_map.set(new THREE.Vector3(1, -2, 1), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, -2, 1), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, -1, 1), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, 0, 2), 0);
    ws_expected.cube_map.set(new THREE.Vector3(1, 0, 2), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, 0, 2), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, -1, 2), 0);
    ws_expected.cube_map.set(new THREE.Vector3(2, -2, 2), 0);
    ws_expected.cube_map.set(new THREE.Vector3(1, -2, 2), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, -2, 2), 0);
    ws_expected.cube_map.set(new THREE.Vector3(0, -1, 2), 0);
    ws_expected.dragon_pos.add(UP.clone().multiplyScalar(3));
    expect(run(ws, prog as Program) instanceof RuntimeError).toBe(false);
    // console.log(JSON.stringify(ws, null, 2));
    // console.log(JSON.stringify(ws_expected, null, 2));
    expect(_.isEqual(ws, ws_expected)).toBe(true);
});