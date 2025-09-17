import {ChangePosition} from "./change";
import {Path} from "./path";

export type ReferenceFilter = (path:Path, node: any) => boolean;

export interface ChangeDbInterface {
    getRoots(path:Path):Path[];
    applyAdd(path:Path):void;
    applyDelete(path:Path):void;
    applyMove(from:Path, to:Path):void;
    applyReorder(from:Path, to:Path|null, position:ChangePosition):void;
    applySet(path:Path, val:any):void;
    set(path:Path, val:any):Path[];
    setRoot(path:Path, val:any):Path[];
    addReference(path:Path, filter: ReferenceFilter):void;
    removeReference(path:Path, filter:ReferenceFilter):void;

    get(path:Path):any;
    /**
     * stops new roots from being added this is useful
     */
    lockRoots(callback: () => void):void;
}
