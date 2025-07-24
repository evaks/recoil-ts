// Copyright 2007 The Closure Library Authors. All Rights Reserved.
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
 * @fileoverview Tooltip widget implementation.
 *
 * @author eae@google.com (Emil A Eklund)
 * @see ../demos/tooltip.html
 */


import {assert} from "../util/goog";
import {
    append,
    contains, createTextNode,
    DomHelper,
    getClientViewportElement,
    getDomHelper,
    getElement, getPageOffset, getRequiredElement, getSize,
    getTextContent, getVisibleRectForElement,
    removeChildren, removeNode,
    setTextContent
} from "./dom/dom";
import {EventType} from "./dom/eventType";
import {TagName} from "./dom/tags";
import {EventHelper, Unlistener} from "./eventhelper";
import {Box} from "./dom/box";
import {AnchoredPosition} from "./positioning/anchoredposition";
import {Corner, Overflow, OverflowStatus, positionAtAnchor} from "./positioning/positioning";
import {Coordinate} from "./dom/coordinate";
import {set, setAll} from "./dom/classlist";
import {AbstractPosition} from "./positioning/abstractposition";
import {PopupBase} from "./popupbase";

/**
 * Possible states for the tooltip to be in.
 * @enum {number}
 */
enum State {
    INACTIVE = 0,
    WAITING_TO_SHOW = 1,
    SHOWING = 2,
    WAITING_TO_HIDE = 3,
    UPDATING = 4  // waiting to show new hovercard while old one still showing.
}

/**
 * Popup activation types. Used to select a positioning strategy.
 * @enum {number}
 */
enum Activation {
    CURSOR = 0,
    FOCUS = 1
}

/**
 * Tooltip widget. Can be attached to one or more elements and is shown, with a
 * slight delay, when the the cursor is over the element or the element gains
 * focus.
 *
 * @param {Element|string=} opt_el Element to display tooltip for, either
 *     element reference or string id.
 * @param {?string=} opt_str Text message to display in tooltip.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @constructor
 * @extends {goog.ui.Popup}
 */
export class Tooltip extends PopupBase{
    private dom_: DomHelper;
    private focusListeners_: Unlistener[] = [];
    /**
     * CSS class name for tooltip.
     */
    className: string = getCssName('recoil-tooltip');
    /**
     * List of active (open) tooltip widgets. Used to prevent multiple tooltips
     * from appearing at once.
     */
    private static activeInstances_: Set<Tooltip> = new Set<Tooltip>();


    /**
     * Active element reference. Used by the delayed show functionality to keep
     * track of the element the mouse is over or the element with focus.
     */
    private activeEl_: Element | null = null;
    /**
     * Delay in milliseconds since the last mouseover or mousemove before the
     * tooltip is displayed for an element.
     */
    private showDelayMs_: number = 500;
    /**
     * Timer for when to show. the type is different between node and browser
     * so just leave as any
     */
    protected showTimer: any;
    /**
     * Delay in milliseconds before tooltips are hidden.
     */
    private hideDelayMs_ = 0;
    /**
     * Timer for when to hide.
     */
    protected hideTimer: any;
    /**
     * Whether the anchor has seen the cursor move or has received focus since the
     * tooltip was last shown. Used to ignore mouse over events triggered by view
     * changes and UI updates.
     */
    private seenInteraction_: boolean | undefined;
    /**
     * Whether the cursor must have moved before the tooltip will be shown.
     */
    private requireInteraction_: boolean | undefined;
    /**
     * If this tooltip's element contains another tooltip that becomes active, this
     * property identifies that tooltip so that we can check if this tooltip should
     * not be hidden because the nested tooltip is active.
     */
    private childTooltip_: Tooltip | null = null;
    /**
     * Element that triggered the tooltip.  Note that if a second element triggers
     * this tooltip, anchor becomes that second element, even if its show is
     * cancelled and the original tooltip survives.
     *
     * @type {Element|undefined}
     * @protected
     */
    protected anchor: Element | null  = null;
    private attachedElements_ = new Map<Element, Unlistener[]>();
    private elementMouseListeners_: Unlistener[] = [];
    private cursorPosition:Coordinate;

    constructor(opt_el?: Element, opt_str?:string, opt_domHelper?:DomHelper) {
        let dom = getDomHelper(opt_el ? getElement(opt_el): null);
        super(dom.createDom(
            TagName.DIV, {'style': 'position:absolute;display:none;'}));
        this.dom_ = dom;

        /**
         * Cursor position relative to the page.
         * @type {!Coordinate}
         * @protected
         */
        this.cursorPosition = new Coordinate(1, 1);

        /**
         * Elements this widget is attached to.
         * @type {goog.structs.Set}
         * @private
         */

        // Attach to element, if specified
        if (opt_el) {
            this.attach(opt_el);
        }

        // Set message, if specified.
        removeChildren(this.element_);
        if (opt_str != null) {
            this.element_.appendChild(createTextNode(opt_str));
        }
    }

    setClasses(classes:string[]) {
        setAll(this.element_ as HTMLElement, classes);
    }
    /**
     * Returns the dom helper that is being used on this component.
     * @return {goog.dom.DomHelper} The dom helper used on this component.
     */
    getDomHelper(): DomHelper {
        return this.dom_;
    }


    /**
     * @return Active tooltip in a child element, or null if none.
     * @protected
     */
    getChildTooltip():Tooltip|null {
        return this.childTooltip_;
    }


    /**
     * Handler for mouse out and blur events.
     */
    protected handleMouseOutAndBlur(event: MouseEvent) {
        let el = this.getAnchorFromElement(event.target as Element);
        let elTo = this.getAnchorFromElement(
            (event.relatedTarget) as Element);
        if (el == elTo) {
            // We haven't really left the anchor, just moved from one child to
            // another.
            return;
        }

        if (el == this.activeEl_) {
            this.activeEl_ = null;
        }

        this.clearShowTimer();
        this.seenInteraction_ = false;
        if (this.isVisible() &&
            (!event.relatedTarget ||
                !contains(this.element_, event.relatedTarget))) {
            this.startHideTimer();
        } else {
            this.anchor = null;
        }
    }

    /**
     * Attach to element. Tooltip will be displayed when the cursor is over the
     * element or when the element has been active for a few milliseconds.
     *
     * @param {Element|string} el Element to display tooltip for, either element
     *                            reference or string id.
     */
    attach(elOrId: Element | string) {
        let el = getRequiredElement(elOrId);

        let listeners: Unlistener[] = this.attachedElements_.get(el) || [];
        this.attachedElements_.set(el, listeners);
        EventHelper.reregister(listeners,
            EventHelper.listen(el, EventType.MOUSEOVER, this.handleMouseOver.bind(this), false),
            EventHelper.listen(el, EventType.MOUSEOUT, this.handleMouseOutAndBlur.bind(this), false),

            EventHelper.listen(el, EventType.MOUSEMOVE, this.handleMouseMove.bind(this), false),
            EventHelper.listen(el, EventType.FOCUS, this.handleFocus.bind(this), false),
            EventHelper.listen(el, EventType.BLUR, this.handleMouseOutAndBlur.bind(this), false));
    }


    /**
     * Detach from element(s).
     *
     * @param {Element|string=} opt_el Element to detach from, either element
     *                                reference or string id. If no element is
     *                                specified all are detached.
     */
    detach(opt_el?: Element | string) {
        if (opt_el) {
            let el = getElement(opt_el);

            if (el) {
                this.detachElement_(el);
                this.attachedElements_.delete(el);
            }

        } else {
            for (let el of this.attachedElements_.keys()) {
                this.detachElement_(el);
            }
            this.attachedElements_.clear();
        }
    }

    /**
     * Handler for mouse over events.
     *
     * @param {goog.events.BrowserEvent} event Event object.
     * @protected
     */
    handleMouseOver(event: MouseEvent) {
        let el = this.getAnchorFromElement(event.target as Element);
        this.activeEl_ = el;
        this.clearHideTimer();
        if (el != this.anchor) {
            this.anchor = el;
            this.startShowTimer(el);
            this.checkForParentTooltip_();
            this.saveCursorPosition_(event);
        }
    }


    /**
     * If this tooltip is inside another tooltip's element, then it may have
     * prevented that tooltip from hiding.  When this tooltip hides, we'll need
     * to check if the parent should be hidden as well.
     */
    private parentTooltip_: Tooltip | null = null;


    /**
     * Detach from element.
     *
     * @param el Element to detach from.
     */
    private detachElement_(el: Element) {

        let listeners = this.attachedElements_.get(el);
        if (listeners) {
            EventHelper.reregister(listeners);
        }
    }

    /**
     * Sets delay in milliseconds before tooltip is displayed for an element.
     *
     * @param {number} delay The delay in milliseconds.
     */
    setShowDelayMs(delay: number) {
        this.showDelayMs_ = delay;
    }


    /**
     * @return {number} The delay in milliseconds before tooltip is displayed for an
     *     element.
     */
    getShowDelayMs(): number {
        return this.showDelayMs_;
    }
    ;


    /**
     * Sets delay in milliseconds before tooltip is hidden once the cursor leavs
     * the element.
     *
     * @param {number} delay The delay in milliseconds.
     */
    setHideDelayMs(delay: number) {
        this.hideDelayMs_ = delay;
    }
    ;


    /**
     * @return {number} The delay in milliseconds before tooltip is hidden once the
     *     cursor leaves the element.
     */
    getHideDelayMs() {
        return this.hideDelayMs_;
    }


    setContext(value: string | Node) {
        if (typeof value == "string") {
            setTextContent(this.element_, value);
        } else {
            removeChildren(this.element_);
            append(this.element_, value);
        }
    }


    /**
     * Sets tooltip element.
     *
     * @param {Element} el HTML element to use as the tooltip.
     * @override
     */
    setElement(el:Element) {
        removeChildren(this.element_);
        this.element_.appendChild(this.element_);
    }


    /**
     * Handler for keyboard focus events of elements inside the tooltip's content
     * element. This should only be invoked if this.getElement() != null.
     * @private
     */
    private registerContentFocusEvents_() {
        this.focusListeners_.map(v => v.unlisten);
        this.focusListeners_ = [
            EventHelper.listen(this.element_, EventType.FOCUSIN, this.clearHideTimer.bind(this)),
            EventHelper.listen(this.element_, EventType.FOCUSOUT, this.startHideTimer.bind(this))];
    }


    /**
     * @return {string} The tooltip message as plain text.
     */
    getText() {
        return getTextContent(this.element_);
    }


    /**
     * @return {goog.ui.Tooltip.State} Current state of tooltip.
     */
    getState() {
        return this.showTimer ?
            (this.isVisible() ? State.UPDATING : State.WAITING_TO_SHOW) :
            this.hideTimer ? State.WAITING_TO_HIDE :
                this.isVisible() ? State.SHOWING : State.INACTIVE;
    }


    /**
     * Sets whether tooltip requires the mouse to have moved or the anchor receive
     * focus before the tooltip will be shown.
     * @param requireInteraction Whether tooltip should require some user
     *     interaction before showing tooltip.
     */
    setRequireInteraction(requireInteraction: boolean) {
        this.requireInteraction_ = requireInteraction;
    }


    /**
     * Returns true if the coord is in the tooltip.
     * @param {Coordinate} coord Coordinate being tested.
     * @return {boolean} Whether the coord is in the tooltip.
     */
    isCoordinateInTooltip(coord:Coordinate) {
        // Check if coord is inside the the tooltip
        if (!this.isVisible()) {
            return false;
        }

        let offset = getPageOffset(this.element_);
        let size = getSize(this.element_);
        return offset.x <= coord.x && coord.x <= offset.x + size.width &&
            offset.y <= coord.y && coord.y <= offset.y + size.height;
    }


    /**
     * Called before the popup is shown.
     *
     * @return {boolean} Whether tooltip should be shown.
     * @protected
     * @override
     */
    onBeforeShow() {
        if (!super.onBeforeShow()) {
            return false;
        }

        // Hide all open tooltips except if this tooltip is triggered by an element
        // inside another tooltip.
        if (this.anchor) {
            for (let tt of Tooltip.activeInstances_) {
                if (!contains(tt.element_, this.anchor)) {
                    tt.setVisible(false);
                }
            }
        }

        Tooltip.activeInstances_.add(this);

        let element = this.element_;
        element.className = this.className;
        this.clearHideTimer();

        // Register event handlers for tooltip. Used to prevent the tooltip from
        // closing if the cursor is over the tooltip rather then the element that
        // triggered it.
        EventHelper.reregister(this.elementMouseListeners_,
            EventHelper.listen(this.element_,
                EventType.MOUSEOVER, this.handleTooltipMouseOver.bind(this), false),
            EventHelper.listen(
                this.element_, EventType.MOUSEOUT, this.handleTooltipMouseOut.bind(this), false));
        this.clearShowTimer();
        return true;
    }


    /** @override */
    onHide() {
        Tooltip.activeInstances_.delete(this);
        // Hide all open tooltips triggered by an element inside this tooltip.
        let element = this.element_;
        for (let tt of Tooltip.activeInstances_) {
            if (tt.anchor && contains(element, tt.anchor)) {
                tt.setVisible(false);
            }
        }

        // If this tooltip is inside another tooltip, start hide timer for that
        // tooltip in case this tooltip was the only reason it was still showing.
        if (this.parentTooltip_) {
            this.parentTooltip_.startHideTimer();
        }

        EventHelper.reregister(this.elementMouseListeners_);

        this.anchor = null;
        // If we are still waiting to show a different hovercard, don't abort it
        // because you think you haven't seen a mouse move:
        if (this.getState() == State.INACTIVE) {
            this.seenInteraction_ = false;
        }
    }

    /**
     * Called by timer from mouse over handler. Shows tooltip if cursor is still
     * over the same element.
     *
     * @param {Element} el Element to show tooltip for.
     * @param {AbstractPosition=} opt_pos Position to display popup
     *     at.
     */
    maybeShow(el:Element, opt_pos:AbstractPosition) {
        // Assert that the mouse is still over the same element, and that we have not
        // detached from the anchor in the meantime.
        if (this.anchor == el && this.attachedElements_.has(this.anchor)) {
            if (this.seenInteraction_ || !this.requireInteraction_) {
                // If it is currently showing, then hide it, and abort if it doesn't hide.
                this.setVisible(false);
                if (!this.isVisible()) {
                    this.positionAndShow_(el, opt_pos);
                }
            } else {
                this.anchor = null;
            }
        }
        this.showTimer = undefined;
    }
    ;


    /**
     * @return {goog.structs.Set} Elements this widget is attached to.
     * @protected
     */
    getElements():Set<Element> {
        return new Set(this.attachedElements_.keys());
    }


    /**
     * @return {Element} Active element reference.
     */
    getActiveElement() {
        return this.activeEl_;
    }

    /**
     * @param {Element} activeEl Active element reference.
     * @protected
     */
    setActiveElement(activeEl:Element|null) {
        this.activeEl_ = activeEl;
    }

    /**
     * Sets the position helper object associated with the popup.
     *
     * @param {goog.positioning.AbstractPosition} position A position helper object.
     */
    setPosition(position:AbstractPosition) {
        this.position_ = position || undefined;
        if (this.isVisible()) {
            this.reposition();
        }
    }
    /**
     * Shows tooltip for a specific element.
     *
     * @param {Element} el Element to show tooltip for.
     * @param {AbstractPosition=} opt_pos Position to display popup
     *     at.
     */
    showForElement(el, opt_pos) {
        this.attach(el);
        this.activeEl_ = el;

        this.positionAndShow_(el, opt_pos);
    }

    /**
     * Sets tooltip position and shows it.
     *
     * @param {Element} el Element to show tooltip for.
     * @param {AbstractPosition=} opt_pos Position to display popup
     *     at.
     * @private
     */
    private positionAndShow_(el, opt_pos) {
        this.anchor = el;
        this.setPosition(
            opt_pos ||
            this.getPositioningStrategy(goog.ui.Tooltip.Activation.CURSOR));
        this.setVisible(true);
    };


    /**
     * Called by timer from mouse out handler. Hides tooltip if cursor is still
     * outside element and tooltip, or if a child of tooltip has the focus.
     * @param el Tooltip's anchor when hide timer was started.
     */
    maybeHide(el:Element) {
        this.hideTimer = undefined;
        if (el == this.anchor) {
            let dom = this.getDomHelper();
            let focusedEl = dom.getActiveElement();
            // If the tooltip content is focused, then don't hide the tooltip.
            let tooltipContentFocused = focusedEl && this.getElement() &&
                dom.contains(this.getElement(), focusedEl);
            if ((this.activeEl_ == null ||
                    (this.activeEl_ != this.getElement() &&
                        !this.elements_.contains(this.activeEl_))) &&
                !tooltipContentFocused && !this.hasActiveChild()) {
                this.setVisible(false);
            }
        }
    }


    /**
     * @return {boolean} Whether tooltip element contains an active child tooltip,
     *     and should thus not be hidden.  When the child tooltip is hidden, it
     *     will check if the parent should be hidden, too.
     * @protected
     */
    hasActiveChild():boolean {
        return !!(this.childTooltip_ && this.childTooltip_.activeEl_);
    }
    ;


    /**
     * Saves the current mouse cursor position to {@code this.cursorPosition}.
     * @param event MOUSEOVER or MOUSEMOVE event.
     */
    private saveCursorPosition_(event: MouseEvent) {
        let scroll = this.dom_.getDocumentScroll();
        this.cursorPosition.x = event.clientX + scroll.x;
        this.cursorPosition.y = event.clientY + scroll.y;
    }


    /**
     * Find anchor containing the given element, if any.
     *
     * @param el Element that triggered event.
     * @return Element in elements_ array that contains given element,
     *     or null if not found.
     * @protected
     */
    getAnchorFromElement(el: Element|null): Element|null {
        // FireFox has a bug where mouse events relating to <input> elements are
        // sometimes duplicated (often in FF2, rarely in FF3): once for the
        // <input> element and once for a magic hidden <div> element.  Javascript
        // code does not have sufficient permissions to read properties on that
        // magic element and thus will throw an error in this call to
        // getAnchorFromElement_().  In that case we swallow the error.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=330961
        try {
            while (el && !this.attachedElements_.has(el)) {
                el = (el.parentNode) as Element|null;
            }
            return el;
        } catch (e) {
            return null;
        }
    }

    /**
     * Handler for mouse move events.
     *
     * @param {goog.events.BrowserEvent} event MOUSEMOVE event.
     * @protected
     */
    handleMouseMove(event:MouseEvent) {
        this.saveCursorPosition_(event);
        this.seenInteraction_ = true;
    }
    ;


    /**
     * Handler for focus events.
     *
     * @param {goog.events.BrowserEvent} event Event object.
     * @protected
     */
    handleFocus(event:Event) {
        let el = this.getAnchorFromElement(event.target as Element|null);
        this.activeEl_ = el;
        this.seenInteraction_ = true;

        if (this.anchor != el) {
            this.anchor = el;
            let pos = this.getPositioningStrategy(Activation.FOCUS);
            this.clearHideTimer();
            this.startShowTimer(el, pos);

            this.checkForParentTooltip_();
        }
    }
    ;


    /**
     * Return a Position instance for repositioning the tooltip. Override in
     * subclasses to customize the way repositioning is done.
     *
     * @param {goog.ui.Tooltip.Activation} activationType Information about what
     *    kind of event caused the popup to be shown.
     * @return {!AbstractPosition} The position object used
     *    to position the tooltip.
     * @protected
     */
    getPositioningStrategy(activationType) {
        if (activationType == goog.ui.Tooltip.Activation.CURSOR) {
            let coord = this.cursorPosition.clone();
            return new CursorTooltipPosition(coord);
        }
        return new ElementTooltipPosition(this.activeEl_);
    }
    ;


    /**
     * Looks for an active tooltip whose element contains this tooltip's anchor.
     * This allows us to prevent hides until they are really necessary.
     *
     * @private
     */
    private checkForParentTooltip_() {
        if (this.anchor) {
            for (let tt of  Tooltip.activeInstances_) {
                if (contains(tt.element_, this.anchor)) {
                    tt.childTooltip_ = this;
                    this.parentTooltip_ = tt;
                }
            }
        }
    };


;


    /**
     * Handler for mouse over events for the tooltip element.
     *
     * @param {goog.events.BrowserEvent} event Event object.
     * @protected
     */
    handleTooltipMouseOver(event: Event) {
        let element = this.element_;
        if (this.activeEl_ != element) {
            this.clearHideTimer();
            this.activeEl_ = element;
        }
    }
    ;


    /**
     * Handler for mouse out events for the tooltip element.
     *
     * @param {goog.events.BrowserEvent} event Event object.
     * @protected
     */
    handleTooltipMouseOut(event: Event) {
        let element = this.getElement();
        if (this.activeEl_ == element &&
            (!event.relatedTarget ||
                !contains(element, event.relatedTarget))) {
            this.activeEl_ = null;
            this.startHideTimer();
        }
    }
    ;


    /**
     * Helper method, starts timer that calls maybeShow. Parameters are passed to
     * the maybeShow method.
     *
     * @param el Element to show tooltip for.
     * @param {AbstractPosition=} opt_pos Position to display popup
     *     atg.
     * @protected
     */
    startShowTimer(el: Element, opt_pos?) {
        if (!this.showTimer) {
            this.showTimer = setTimeout(() => this.maybeShow(el, opt_pos), this.showDelayMs_);

        }
    }


    /**
     * Helper method called to clear the show timer.
     */
    protected clearShowTimer() {
        if (this.showTimer) {
            clearTimeout(this.showTimer);
            this.showTimer = undefined;
        }
    }

    /**
     * Helper method called to start the close timer.
     * @protected
     */
    startHideTimer() {
        if (this.getState() == State.SHOWING) {
            this.hideTimer = setTimeout(() => this.maybeHide(this.anchor), this.getHideDelayMs());
        }
    }


    /**
     * Helper method called to clear the close timer.
     * @protected
     */
    clearHideTimer() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = undefined;
        }
    }


    /** @override */
    disposeInternal() {
        this.setVisible(false);
        this.clearShowTimer();
        this.detach();
        removeNode(this.element_);
        this.activeEl_ = null;
        delete this.dom_;
    }
}


/**
 * Popup position implementation that positions the popup (the tooltip in this
 * case) based on the cursor position. It's positioned below the cursor to the
 * right if there's enough room to fit all of it inside the Viewport. Otherwise
 * it's displayed as far right as possible either above or below the element.
 *
 * Used to position tooltips triggered by the cursor.
 *
 * @param {number|!Coordinate} arg1 Left position or coordinate.
 * @param {number=} opt_arg2 Top position.
 * @constructor
 * @extends {ViewportPosition}
 * @final
 */
class CursorTooltipPosition {
    constructor(arg1, opt_arg2) {
        ViewportPosition.call(this, arg1, opt_arg2);
    }


    /**
     * Repositions the popup based on cursor position.
     *
     * @param {Element} element The DOM element of the popup.
     * @param {Corner} popupCorner The corner of the popup element
     *     that that should be positioned adjacent to the anchorElement.
     * @param {Box=} opt_margin A margin specified in pixels.
     * @override
     */

    reposition(
        element, popupCorner, opt_margin) {
        let viewportElt = getClientViewportElement(element);
        let viewport = getVisibleRectForElement(viewportElt);
        let margin = opt_margin ?
            new Box(
                opt_margin.top + 10, opt_margin.right, opt_margin.bottom,
                opt_margin.left + 10) :
            new Box(10, 0, 0, 10);

        if (positionAtCoordinate(
                this.coordinate, element, Corner.TOP_START, margin,
                viewport, Overflow.ADJUST_X |
                Overflow.FAIL_Y) &
            OverflowStatus.FAILED) {
            positionAtCoordinate(
                this.coordinate, element, Corner.TOP_START, margin,
                viewport, Overflow.ADJUST_X |
                Overflow.ADJUST_Y);
        }
    }
}

/**
 * Popup position implementation that positions the popup (the tooltip in this
 * case) based on the element position. It's positioned below the element to the
 * right if there's enough room to fit all of it inside the Viewport. Otherwise
 * it's displayed as far right as possible either above or below the element.
 *
 * Used to position tooltips triggered by focus changes.
 *
 * @param {Element} element The element to anchor the popup at.
 * @constructor
 * @extends {AnchoredPosition}
 */
class ElementTooltipPosition extends AnchoredPosition {
    constructor(element: Element) {
        super(element, Corner.BOTTOM_RIGHT);
    }


    /**
     * Repositions the popup based on element position.
     *
     * @param {Element} element The DOM element of the popup.
     * @param {Corner} popupCorner The corner of the popup element
     *     that should be positioned adjacent to the anchorElement.
     * @param {Box=} opt_margin A margin specified in pixels.
     * @override
     */
    reposition(
        element:Element, popupCorner:Corner, opt_margin?:Box) {
        let offset = new Coordinate(10, 0);

        if (positionAtAnchor(
                this.element, this.corner, element, popupCorner, offset, opt_margin,
                Overflow.ADJUST_X |
                Overflow.FAIL_Y) &
            OverflowStatus.FAILED) {
            positionAtAnchor(
                this.element, Corner.TOP_RIGHT, element,
                Corner.BOTTOM_LEFT, offset, opt_margin,
                Overflow.ADJUST_X |
                Overflow.ADJUST_Y);
        }
    };


}
