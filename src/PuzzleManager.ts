/* eslint-disable */
import _ from "lodash"
/* eslint-enable */
import { PuzzleSpec } from "./PuzzleState"

type PuzzleConnection = {
    source: string
    dest: string
}

// A puzzle sequence is a set of puzzles related to a particular topic
type PuzzleSequence = {
    name: string // display name
    tag: string // internal name
    puzzles: PuzzleSpec[] // list of parsed PuzzleSpecs for the puzzles in the sequence
    connections: PuzzleConnection[] // connections between puzzles (i.e., edges in a graph)
}

export type PuzzlePack = {
    name: string
    seqs: PuzzleSequence[] // a pack consists of some number of puzzle sequences
}

type PuzzleIndex = {
    pack_index: number
    seq_index: number
    puz_index: number
}

/* 
 * The PuzzleManager will load public/packs/packs.json to get a list of the jsons for each pack
 * It will then load and store each of those pack jsons in the array `packs`
 * PuzzleManager also tracks the current puzzle via indexes for the current
 * pack, current sequence, and current puzzle.
 * See comments on the types above for the contents of a pack.
 */

export default class PuzzleManager {
    packs: PuzzlePack[]
    current_puzzle: PuzzleIndex
    completed_puzzle: Map<string, PuzzleSpec[]> //the map of completed puzzles

    constructor() {
        this.packs = []
        this.current_puzzle = {
            pack_index: 0,
            seq_index: 0,
            puz_index: 0
        }
        this.completed_puzzle = new Map<string, PuzzleSpec[]>();//key = name of PuzzlePack, value = a puzzle
    }

    //checks if current puzzle is the last puzzle completed in a sequence
    check_complete_pack() {
        let current_sequence = this.get_current_seq().puzzles;
        let current_pack = this.get_current_pack().name;
        for (let puzzle of current_sequence) {
            let puzzles = this.completed_puzzle.get(current_pack);
            if (puzzles) {
                if (!puzzles.includes(puzzle)) {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        return true;
    }

    //adds current puzzle to completed_puzzle
    complete_puzzle() {
        let puzzlePackName = this.get_current_pack().name;

        let puzzles = this.completed_puzzle.get(puzzlePackName);

        if (puzzles === undefined) {
            //if current puzzle is the first one in its own pack that has been completed
            this.completed_puzzle.set(puzzlePackName, [this.get_current_puzzle()]);
        } else {
            let puzzleToAdd = this.get_current_puzzle();
            puzzles.push(puzzleToAdd);
            this.completed_puzzle.set(puzzlePackName, puzzles);
        }

    }

    //used to test complete_puzzle and check player progress
    find_completed_puzzle() {
        let completed_puzzle_array = new Array<string>();
        //console.log("completed puzzles: ")
        for (let pack of this.completed_puzzle.keys()) {
            let puzzles = this.completed_puzzle.get(pack);
            if (puzzles) {
                for (let puzzle of puzzles) {
                    completed_puzzle_array.push(puzzle.name);
                }
            }
        }
        return completed_puzzle_array;
    }

    set_completed_puzzle(cp: Map<string, PuzzleSpec[]>) {
        this.completed_puzzle = cp;
    }

    set_pack(index: number) {
        if (index !== this.current_puzzle.pack_index) {
            this.current_puzzle = {
                pack_index: index,
                seq_index: 0,
                puz_index: 0
            }
        }
    }

    // assumes `tag` identifies a unique puzzle within the current pack
    set_puzzle(tag: string) {
        let found = false;
        this.get_current_pack().seqs.forEach((seq, i) => {
            seq.puzzles.forEach((spec, j) => {
                if (spec.tag === tag) {
                    this.current_puzzle = {
                        pack_index: this.current_puzzle.pack_index,
                        seq_index: i,
                        puz_index: j
                    }
                    found = true;
                }
            });
        });

        if (!found) {
            throw new Error(`No puzzle with tag=${tag} exists within the current pack ${this.get_current_pack().name}`);
        }
    }

    // returns a list of the tags for all the puzzles in the current pack
    get_all_puzzles(): string[] {
        let puzzles: string[] = [];
        for (let seq of this.get_current_pack().seqs) {
            puzzles.push(...seq.puzzles.map(ps => ps.tag));
        }
        // console.log("puzzles: " + puzzles);
        return puzzles;
    }

    get_current_puzzle(): PuzzleSpec {
        return this.get_current_seq().puzzles[this.current_puzzle.puz_index];
    }

    get_current_seq(): PuzzleSequence {
        return this.get_current_pack().seqs[this.current_puzzle.seq_index];
    }

    get_current_pack(): PuzzlePack {
        return this.packs[this.current_puzzle.pack_index];
    }

    next_puzzle(): PuzzleSpec | undefined {
        this.current_puzzle.puz_index = this.current_puzzle.puz_index + 1;
        // check if we've reached the end of the current sequence
        if (this.current_puzzle.puz_index === this.get_current_seq().puzzles.length) {
            this.current_puzzle.puz_index = 0;
            this.current_puzzle.seq_index++;
            // check if we've reached the end of the current pack
            if (this.current_puzzle.seq_index === this.get_current_pack().seqs.length) {
                return;
            }
        }
        return this.get_current_seq().puzzles[this.current_puzzle.puz_index];
    }

    get_granted_blocks(devMode: boolean) {
        let granted_blocks: string[] = [];
        if (devMode) {
            for (let pack of this.packs) {
                for (let seq of pack.seqs) {
                    for (let puzzle of seq.puzzles) {
                        let blocks = puzzle.library.granted;
                        for (let block of blocks) {
                            if (!granted_blocks.includes(block))
                                granted_blocks.push(block);
                        }
                    }
                }
            }
        } else {
            for (let pack of this.completed_puzzle.keys()) {
                let puzzles = this.completed_puzzle.get(pack);

                if (puzzles) {
                    for (let puzzle of puzzles) {
                        let blocks = puzzle.library.granted;
                        for (let block of blocks) {
                            if (!granted_blocks.includes(block))
                                granted_blocks.push(block);
                        }
                    }
                }
            }
        }
        // include anything required or granted by the current puzzle
        if (this.get_current_puzzle()) {
            for (let block of this.get_current_puzzle().library.required.concat(this.get_current_puzzle().library.granted)) {
                if (!granted_blocks.includes(block))
                    granted_blocks.push(block);
            }
        }
        return granted_blocks
    }

    load_packs(pack_list: { packs: string[] }) {
        return new Promise<Promise<PuzzlePack>[]>((resolve) => {
            let pack_promises: Promise<PuzzlePack>[] = []
            for (let packfile of pack_list.packs) {
                pack_promises.push(fetch(`packs/${packfile}`)
                    .then(response => response.json())
                    .catch(error => {
                        console.error(`Problem encountered loading packs/${packfile}: ${error}`);
                    }));
            }
            resolve(pack_promises);
        });
    }

    load_all_puzzles() {
        let promises: Promise<PuzzleSpec>[] = [];
        for (let pack of this.packs) {
            for (let seq of pack.seqs) {
                // HACK: seqs is a list of strings when initially parsed from JSON,
                // we are replacing those with PuzzleStates here
                ((seq.puzzles as unknown) as string[]).forEach((tag, index) => {
                    promises.push(fetch(`puzzles/${tag}.json`)
                        .then(response => response.json())
                        .then(json => seq.puzzles[index] = json)
                        .catch(error => console.error(`Could not load spec from puzzles/${tag}.json: ${error}`)));
                });
            }
        }
        return Promise.all(promises);
    }

    // the nested promise structure is a little wonky, and doesn't handle errors as gracefully as I'd like
    // but it does work
    initialize() {
        return fetch("packs/packs.json")
            .then(response => { return response.json() })
            .then(this.load_packs)
            .then(pack_promises => Promise.all(pack_promises))
            .then(packs => this.packs = packs)
            .then(() => this.load_all_puzzles())
            .catch(error => console.error(`Problem encountered loading packs/packs.json: ${error}`));
    }
}