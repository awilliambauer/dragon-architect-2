
type PuzzleConnection = {
    source: string
    dest: string
}

type PuzzleSequence = {
    name: string
    tag: string
    puzzles: string[]
    connections: PuzzleConnection[]
}

type PuzzlePack = {
    name: string
    seqs: PuzzleSequence[]
}

export default class PuzzleManager {
    packs: PuzzlePack[]

    constructor() {
        this.packs = []
    }

    load_packs(pack_list: { packs: string[] }) {
        return new Promise<Promise<PuzzlePack>[]>((resolve, reject) => {
            let pack_promises: Promise<PuzzlePack>[] = []
            for (let packfile of pack_list.packs) {
                pack_promises.push(fetch(`packs/${packfile}`)
                .then(response => response.json()));
            }
            resolve(pack_promises);
        });
    }

    initialize() {
        fetch("packs/packs.json")
            .then(response => response.json())
            .then(this.load_packs)
            .then(pack_promises => Promise.all(pack_promises))
            .then(packs => this.packs = packs)
            .catch(error => console.error(error));
    }
}