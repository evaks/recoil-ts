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
 * @fileoverview Anchored viewport positioning class.
 *
 * @author eae@google.com (Emil A Eklund)
 */

import {Box} from "../dom/box.ts";
import {
    Corner,
    flipCornerHorizontal,
    flipCornerVertical,
    Overflow,
    OverflowStatus,
    positionAtAnchor
} from "./positioning.ts";
import {Size} from "../dom/size.ts";
import {AnchoredPosition} from "./anchoredposition.ts";

export class AnchoredViewportPosition extends AnchoredPosition {
    private overflowConstraint_: Box | undefined;
    private lastResortOverflow_: number;

    /**
     * Encapsulates a popup position where the popup is anchored at a corner of
     * an element. The corners are swapped if dictated by the viewport. For instance
     * if a popup is anchored with its top left corner to the bottom left corner of
     * the anchor the popup is either displayed below the anchor (as specified) or
     * above it if there's not enough room to display it below.
     *
     * When using this positioning object it's recommended that the movable element
     * be absolutely positioned.
     *
     * @param anchorElement Element the movable element should be
     *     anchored against.
     * @param corner Corner of anchored element the
     *     movable element should be positioned at.
     * @param opt_adjust Whether the positioning should be adjusted until
     *     the element fits inside the viewport even if that means that the anchored
     *     corners are ignored.
     * @param opt_overflowConstraint Box object describing the
     *     dimensions in which the movable element could be shown.
     */
    constructor(anchorElement: Element, corner: Corner, opt_adjust?: boolean, opt_overflowConstraint?: Box) {
        super(anchorElement, corner);

        /**
         * The last resort algorithm to use if the algorithm can't fit inside
         * the viewport.
         *
         * IGNORE = do nothing, just display at the preferred position.
         *
         * ADJUST_X | ADJUST_Y = Adjust until the element fits, even if that means
         * that the anchored corners are ignored.
         *
         * @type {number}
         * @private
         */
        this.lastResortOverflow_ = opt_adjust ? (Overflow.ADJUST_X |
                Overflow.ADJUST_Y) :
            Overflow.IGNORE;

        /**
         * The dimensions in which the movable element could be shown.
         */
        this.overflowConstraint_ = opt_overflowConstraint || undefined;
    }

    getOverflowConstraint(): Box|undefined {
        return this.overflowConstraint_;
    };


    /**
     * @param overflowConstraint Box object describing the
     *     dimensions in which the movable element could be shown.
     */
    setOverflowConstraint(overflowConstraint:Box|undefined) {
        this.overflowConstraint_ = overflowConstraint;
    };


    /**
     * @return A bitmask for the "last resort" overflow.
     */
    getLastResortOverflow():number {
        return this.lastResortOverflow_;
    };


    /**
     * @param {number} lastResortOverflow A bitmask for the "last resort" overflow,
     *     if we fail to fit the element on-screen.
     */
    setLastResortOverflow(lastResortOverflow:number) {
        this.lastResortOverflow_ = lastResortOverflow;
    };


    /**
     * Repositions the movable element.
     *
     * @param movableElement Element to position.
     * @param movableCorner Corner of the movable element
     *     that should be positioned adjacent to the anchored element.
     * @param opt_margin A margin specified in pixels.
     * @param opt_preferredSize The preferred size of the
     *     movableElement.
     * @override
     */
    reposition(
        movableElement: Element, movableCorner: Corner, opt_margin?: Box, opt_preferredSize?: Size) {
        let status = positionAtAnchor(
            this.element, this.corner, movableElement, movableCorner, null,
            opt_margin,
            Overflow.FAIL_X | Overflow.FAIL_Y,
            opt_preferredSize, this.overflowConstraint_);

        // If the desired position is outside the viewport try mirroring the corners
        // horizontally or vertically.
        if (status & OverflowStatus.FAILED) {
            let cornerFallback = this.adjustCorner(status, this.corner);
            let movableCornerFallback = this.adjustCorner(status, movableCorner);

            status = positionAtAnchor(
                this.element, cornerFallback, movableElement, movableCornerFallback,
                null, opt_margin,
                Overflow.FAIL_X | Overflow.FAIL_Y,
                opt_preferredSize, this.overflowConstraint_);

            if (status & OverflowStatus.FAILED) {
                // If that also fails, pick the best corner from the two tries,
                // and adjust the position until it fits.
                cornerFallback = this.adjustCorner(status, cornerFallback);
                movableCornerFallback = this.adjustCorner(status, movableCornerFallback);

                positionAtAnchor(
                    this.element, cornerFallback, movableElement, movableCornerFallback,
                    null, opt_margin, this.getLastResortOverflow(), opt_preferredSize,
                    this.overflowConstraint_);
            }
        }
    };


    /**
     * Adjusts the corner if X or Y positioning failed.
     * @param status The status of the last positionAtAnchor call.
     * @param corner The corner to adjust.
     * @return The adjusted corner.
     */
    adjustCorner(
        status:number, corner:Corner):Corner {
        if (status & OverflowStatus.FAILED_HORIZONTAL) {
            corner = flipCornerHorizontal(corner);
        }

        if (status & OverflowStatus.FAILED_VERTICAL) {
            corner = flipCornerVertical(corner);
        }

        return corner;
    };

}


