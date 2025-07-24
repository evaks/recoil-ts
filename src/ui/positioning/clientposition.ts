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

/**
 * @fileoverview Client positioning class.
 *
 * @author eae@google.com (Emil A Eklund)
 * @author chrishenry@google.com (Chris Henry)
 */


import { Coordinate } from "../dom/coordinate";
import {AbstractPosition} from "./abstractposition";
import {Corner, getOffsetParentPageOffset, positionAtCoordinate} from "./positioning";
import {Box} from "../dom/box";
import {Size} from "../dom/size";
import {getOwnerDocument, getViewportPageOffset} from "../dom/dom";

/**
 * Encapsulates a popup position where the popup is positioned relative to the
 * window (client) coordinates. This calculates the correct position to
 * use even if the element is relatively positioned to some other element. This
 * is for trying to position an element at the spot of the mouse cursor in
 * a MOUSEMOVE event. Just use the event.clientX and event.clientY as the
 * parameters.
 *
 * @param arg1 Left position or coordinate.
 * @param opt_arg2 Top position.
 * @constructor
 * @extends 
 */

export class ClientPosition extends AbstractPosition {
    protected readonly coordinate: Coordinate;

    constructor(leftOrPos: Coordinate | number, top?: number) {
        super();
        this.coordinate = leftOrPos instanceof Coordinate ?
            leftOrPos : new Coordinate(leftOrPos, top);
    }

    /**
     * Repositions the popup according to the current state
     *
     * @param movableElement The DOM element of the popup.
     * @param movableElementCorner The corner of
     *     the popup element that that should be positioned adjacent to
     *     the anchorElement.  One of the goog.positioning.Corner
     *     constants.
     * @param opt_margin A margin specified in pixels.
     * @param opt_preferredSize Preferred size of the element.
     * @override
     */
    reposition(
        movableElement: Element, movableElementCorner: Corner, opt_margin?: Box, opt_preferredSize?: Size) {
        // Translates the coordinate to be relative to the page.
        let viewportOffset = getViewportPageOffset(
            getOwnerDocument(movableElement));
        let x = this.coordinate.x + viewportOffset.x;
        let y = this.coordinate.y + viewportOffset.y;

        // Translates the coordinate to be relative to the offset parent.
        let movableParentTopLeft =
            getOffsetParentPageOffset(movableElement);
        x -= movableParentTopLeft.x;
        y -= movableParentTopLeft.y;


        positionAtCoordinate(
            new Coordinate(x, y), movableElement, movableElementCorner,
            opt_margin, undefined, undefined, opt_preferredSize);
    }
}
