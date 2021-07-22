export function mapHasVector3(map: Map<THREE.Vector3, any>, vec: THREE.Vector3): boolean {
    for (let [key, _val] of map) {
        if (key.equals(vec)) {
            return true;
        }
    }
    return false;
}

export function mapGetVector3<T>(map: Map<THREE.Vector3, T>, vec: THREE.Vector3): T | undefined {
    for (let [key, val] of map) {
        if (key.equals(vec)) {
            return val;
        }
    }
}

export function mapDeleteVector3(map: Map<THREE.Vector3, any>, vec: THREE.Vector3): boolean {
    for (let [key, _val] of map) {
        if (key.equals(vec)) {
            map.delete(key);
            return true;
        }
    }
    return false;
}
