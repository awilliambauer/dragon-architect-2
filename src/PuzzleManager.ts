
type PuzzleConnection = {
    source: string
    dest: string
}

// A puzzle sequence is a set of puzzles related to a particular topic
type PuzzleSequence = {
    name: string // display name
    tag: string // internal name
    puzzles: string[] // list of tags for the puzzles in the sequence
    connections: PuzzleConnection[] // connections between puzzles (i.e., edges in a graph)
}

type PuzzlePack = {
    name: string
    seqs: PuzzleSequence[] // a pack consists of some number of puzzle sequences
}

type CurrentPuzzle = {
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
    current_puzzle: CurrentPuzzle

    constructor() {
        this.packs = []
        this.current_puzzle = {
            pack_index: 0,
            seq_index: 0,
            puz_index: 0
        }
    }

    get_current_puzzle(): string {
        return this.get_current_seq().puzzles[this.current_puzzle.puz_index];
    }

    get_current_seq(): PuzzleSequence {
        return this.get_current_pack().seqs[this.current_puzzle.seq_index];
    }

    get_current_pack(): PuzzlePack {
        return this.packs[this.current_puzzle.pack_index];
    }

    next_puzzle(): string | undefined {
        this.current_puzzle.puz_index++;
        // check if we've reached the end of the current sequence
        if (this.current_puzzle.puz_index == this.get_current_seq().puzzles.length) {
            this.current_puzzle.puz_index = 0;
            this.current_puzzle.seq_index++;
            // check if we've reached the end of the current pack
            if (this.current_puzzle.seq_index == this.get_current_pack().seqs.length) {
                return;
            }
        }
        return this.get_current_seq().puzzles[this.current_puzzle.puz_index];
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

    // the nested promise structure is a little wonky, and doesn't handle errors as gracefully as I'd like
    // but it does work
    initialize() {
        return fetch("packs/packs.json")
            .then(response => response.json())
            .then(this.load_packs)
            .then(pack_promises => Promise.all(pack_promises))
            .then(packs => this.packs = packs)
            .catch(error => console.error(`Problem encountered loading packs/packs.json: ${error}`));
    }
}