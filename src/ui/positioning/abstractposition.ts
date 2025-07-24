// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


import {Box} from "../dom/box";
import {Size} from "../dom/size";
import {Corner} from "./positioning";

/**
 * Abstract position object. Encapsulates position and overflow handling.
 *
 * @constructor
 */
export abstract class AbstractPosition {
    /**
     * Repositions the element. Abstract method, should be overloaded.
     *
     * @param movableElement Element to position.
     * @param corner Corner of the movable element that
     *     should be positioned adjacent to the anchored element.
     * @param opt_margin A margin specified in pixels.
     * @param opt_preferredSize PreferredSize of the movableElement.
     */
    abstract reposition(
        movableElement: Element, corner: Corner, opt_margin?: Box, opt_preferredSize?: Size) :void;
}