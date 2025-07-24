goog.provide('recoil.ui.widgets.ComboWidget');

goog.require('goog.style');
goog.require('goog.ui.Container');
goog.require('goog.ui.Control');
goog.require('goog.ui.Menu');
goog.require('goog.ui.MenuItem');
goog.require('goog.ui.Select');
goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.Debug');
goog.require('recoil.frp.Util');
goog.require('recoil.ui.BoolWithExplanation');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.EventHelper');
goog.require('recoil.ui.TooltipHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.widgets.CheckboxWidget');
goog.require('recoil.ui.widgets.LabelWidget');
goog.require('recoil.ui.widgets.SelectorWidget');
goog.require('recoil.util');

/**
 *
 * @template T
 * @param {!recoil.ui.WidgetScope} scope
 * @param {!recoil.ui.Widget} mainWidget
 * @param {function(?)=} opt_forceSet
 * @implements {recoil.ui.Widget}
 * @constructor
 */
recoil.ui.widgets.ComboWidget = function(scope, mainWidget, opt_forceSet) {
    this.scope_ = scope;
    var frp = this.scope_.getFrp();
    var ib = goog.getCssName('goog-inline-block');
    this.forceSet_ = opt_forceSet || function() {};
    this.widgetDiv_ = goog.dom.createDom('div', {'class': ib});
    this.containerDiv_ = goog.dom.createDom('div', {class: goog.getCssName('goog-combobox')}, this.widgetDiv_);
    this.container_ = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl(this.containerDiv_);

    this.menu_ = new goog.ui.Menu();
    this.menu_.setFocusable(false);
    this.menu_.setVisible(false);
    this.enabled_ = true;
    this.container_.addChild(this.menu_, true);
    this.itemCount_ = 0;
    /**
     * @type {goog.events.ListenableKey|number}
     * @private
     */
    this.listening_ = null;

    this.mainWidget_ = mainWidget;
    mainWidget.getComponent().render(this.widgetDiv_);
    this.button_ = goog.dom.createDom(
        goog.dom.TagName.SPAN, goog.getCssName('goog-combobox-button'));
    goog.dom.setTextContent(this.button_, '\u25BC');
    goog.style.setUnselectable(this.button_, true /* unselectable */);

    this.containerDiv_.appendChild(this.button_);

    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.container_, this, this.updateState_, this.dispose_);

    // this.changeHelper_ = new recoil.ui.EventHelper(scope, this.selector_, goog.ui.Component.EventType.ACTION);
    this.changeHelper_ = new recoil.ui.EventHelper(scope, this.menu_, goog.ui.Component.EventType.ACTION);
    this.enabledHelper_ = new recoil.ui.TooltipHelper(scope, this.container_, this.container_.getElement());
    goog.events.listen(
        this.button_, goog.events.EventType.MOUSEDOWN,
        this.onComboMouseDown_.bind(this));


    goog.events.listen(this.button_, goog.events.EventType.MOUSELEAVE, this.onBlur_.bind(this));
    goog.events.listen(this.menu_.getElement(), goog.events.EventType.MOUSELEAVE, this.onBlur_.bind(this));
    goog.events.listen(this.menu_.getElement(), goog.events.EventType.MOUSEENTER, this.onFocus_.bind(this));
};

/**
 * Clears the dismiss timer if it's active.
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.clearDismissTimer_ = function() {
  if (this.dismissTimer_) {
    goog.Timer.clear(this.dismissTimer_);
    this.dismissTimer_ = null;
  }
};

/**
 * @param {goog.events.BrowserEvent} e The browser event.
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.onComboMouseDown_ = function(e) {
      // We only want this event on the element itself or the input or the button.
    if (this.enabled_ &&
        (goog.dom.contains(this.button_, /** @type {Node} */ (e.target)))) {
        if (this.menu_.isVisible()) {
            this.dismiss();
        } else {
            this.maybeShowMenu_(true);
        }
//        this.input_.select();
        this.menu_.setMouseButtonPressed(true);
        // Stop the click event from stealing focus
        e.preventDefault();
    }

  // Stop the event from propagating outside of the combo box
    e.stopPropagation();
};

/**
 * Shows the menu if it isn't already showing.  Also positions the menu
 * correctly, resets the menu item visibilities and highlights the relevant
 * item.
 * @param {boolean} showAll Whether to show all items, with the first matching
 *     item highlighted.
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.maybeShowMenu_ = function(showAll) {
  var isVisible = this.menu_.isVisible();

  if (isVisible && this.itemCount_ == 0) {
    this.hideMenu_();

  } else if (!isVisible && this.itemCount_ > 0) {
    // In Safari 2.0, when clicking on the combox box, the blur event is
    // received after the click event that invokes this function. Since we want
    // to cancel the dismissal after the blur event is processed, we have to
    // wait for all event processing to happen.
    goog.Timer.callOnce(this.clearDismissTimer_, 1, this);

    this.showMenu_();
  }

  this.positionMenu();
};

/**
 * Show the menu and add an active class to the combo box's element.
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.showMenu_ = function() {
  this.menu_.setVisible(true);
  goog.dom.classlist.add(
      goog.asserts.assert(this.containerDiv_),
      goog.getCssName('goog-combobox-active'));
};


/**
 * Positions the menu.
 * @protected
 */
recoil.ui.widgets.ComboWidget.prototype.positionMenu = function() {
  if (this.menu_ && this.menu_.isVisible()) {
    var position = new goog.positioning.MenuAnchoredPosition(
        this.button_, goog.positioning.Corner.BOTTOM_END, true, true);
      position.reposition(
        this.menu_.getElement(), goog.positioning.Corner.TOP_END);
  }
};


/**
 * Dismisses the menu and resets the value of the edit field.
 */
recoil.ui.widgets.ComboWidget.prototype.dismiss = function() {
    this.clearDismissTimer_();
    this.hideMenu_();
    this.menu_.setHighlightedIndex(-1);
};


/**
 * Hide the menu and remove the active class from the combo box's element.
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.hideMenu_ = function() {
  this.menu_.setVisible(false);
  goog.dom.classlist.remove(
      goog.asserts.assert(this.containerDiv_),
      goog.getCssName('goog-combobox-active'));
};



/**
 * list of functions available when creating a selectorWidget
 */
recoil.ui.widgets.ComboWidget.options = recoil.frp.Util.Options(
    {
        'renderer': recoil.ui.widgets.SelectorWidget.RENDERER,
        'enabledItems' : [],
        'editable': true,
        'enabled' : recoil.ui.BoolWithExplanation.TRUE
    },
    'value' , 'list');

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.ComboWidget.prototype.getComponent = function() {
    return this.container_;
};

/**
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.ComboWidget.prototype.attachStruct = function(options) {
    var frp = this.helper_.getFrp();
    var util = new recoil.frp.Util(frp);
    var bound = recoil.ui.widgets.ComboWidget.options.bind(frp, options);
    this.valueB_ = bound.value();
    this.editableB_ = bound.editable();
    this.listB_ = bound.list();
    /**
     * @type {recoil.frp.Behaviour<!Array<recoil.ui.BoolWithExplanation>>}
     * @private
     */
    this.enabledItemsB_ = bound.enabledItems();
    /**
     * @type {recoil.frp.Behaviour.<!recoil.ui.BoolWithExplanation>}
     * @private
     */
    this.enabledB_ = bound.enabled();
    this.rendererB_ = bound.renderer();

    this.helper_.attach(this.valueB_, this.listB_, this.enabledB_, this.rendererB_,
         this.enabledItemsB_, this.editableB_);

    var me = this;
    this.changeHelper_.listen(this.scope_.getFrp().createCallback(function(e) {
        if (e.target instanceof goog.ui.MenuItem) {
            var val = e.target.getValue();
            if (val && val.valid) {
                me.forceSet_(val.value);
                me.valueB_.set(val.value);
            }
            me.dismiss();
        }
    }, this.valueB_, this.listB_));
    this.enabledHelper_.attach(
        /** @type {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>} */ (this.enabledB_),
        this.helper_);
};
/**
 * Number of milliseconds to wait before dismissing combowidget after blur.
 * @type {number}
 */
recoil.ui.widgets.ComboWidget.BLUR_DISMISS_TIMER_MS = 250;

/**
 * Event handler for when the input box looses focus -- hide the menu
 * @param {goog.events.BrowserEvent} e The browser event.
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.onBlur_ = function(e) {
  this.clearDismissTimer_();
  this.dismissTimer_ = goog.Timer.callOnce(
      this.dismiss, recoil.ui.widgets.ComboWidget.BLUR_DISMISS_TIMER_MS, this);
};

/**
 * Event handler for when the input box looses focus -- hide the menu
 * @param {goog.events.BrowserEvent} e The browser event.
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.onFocus_ = function(e) {
  this.clearDismissTimer_();
};

/**
 * @template T
 * @param {function(T,boolean, recoil.ui.BoolWithExplanation) : string} renderer
 * @param {Object} val
 * @param {boolean} valid
 * @param {recoil.ui.BoolWithExplanation} enabled
 * @return {goog.ui.MenuItem}
 * @private
 */
recoil.ui.widgets.ComboWidget.createMenuItem_ = function(renderer, val, valid, enabled) {
    var item = new goog.ui.MenuItem(renderer(val, valid, enabled), {value: val, valid: valid, enabled: enabled, renderer: renderer});
    if (enabled && enabled.val && !enabled.val()) {
        item.setEnabled(false);
    }
    return item;
};

/**
 * Event handler for when the document is clicked.
 * @param {goog.events.BrowserEvent} e The browser event.
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.onDocClicked_ = function(e) {
    if (!goog.dom.contains(
        this.menu_.getElement(), /** @type {Node} */ (e.target))) {
        this.dismiss();
    }
};

/**
 *
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.dispose_ = function() {
    if (this.listening_) {
        goog.events.unlistenByKey(this.listening_);
        this.listening_ = null;
    }
};
/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.ComboWidget.prototype.updateState_ = function(helper) {
    var me = this;
    if (!this.listening_) {
        this.listening_ = goog.events.listen(document, goog.events.EventType.MOUSEDOWN,
                       this.onDocClicked_.bind(this));
    }
    var enabled = false;
    var editable = true;
    for (var i = this.menu_.getChildCount() - 1; i >= 0; i--) {
        me.menu_.removeChild(this.menu_.getChildAt(i), true);
    }
    if (helper.isGood()) {
        var list = this.listB_.get() || [];
        var enabledItems = this.enabledItemsB_.get();
        var renderer = this.rendererB_.get();

        for (var i = 0; i < list.length; i++) {
            var en = enabledItems.length > i ? enabledItems[i] : recoil.ui.BoolWithExplanation.TRUE;
            var val = list[i];
            var item = recoil.ui.widgets.ComboWidget.createMenuItem_(renderer, val, true, en);

            this.menu_.addChild(item, true);
        }
        this.itemCount_ = list.length;
        enabled = this.enabledB_.get().val();
        editable = this.editableB_.get() && list.length > 0;

    } else {
        this.itemCount_ = 0;
    }


    goog.dom.classlist.enable(
        goog.asserts.assert(this.containerDiv_),
        goog.getCssName('goog-combobox-disabled'), !enabled);
    this.button_.disabled = !enabled;
    goog.style.setElementShown(this.button_, editable);
    this.enabled_ = enabled && editable;
    if (this.itemCount_ === 0 || !enabled || !editable) {
        this.dismiss();
    }
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.ComboWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
