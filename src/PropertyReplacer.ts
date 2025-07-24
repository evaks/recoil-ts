export class PropertyReplacer {
    private originalValues = new Map<any, Map<string, any>>();
    set(object: any, key: string, value: any) {

        let attibs = this.originalValues.get(object) || new Map<string, any>();
        this.originalValues.set(object, attibs);
        if (!attibs.has(key)) {
            attibs.set(key, object[key]);
        }
        object[key] = value;
    }
    reset() {
        for (let [obj, origAttibs] of this.originalValues) {
            for (let [attib, value] of origAttibs) {
                obj[attib] = value;
            }
        }
        this.originalValues.clear();
    }
}