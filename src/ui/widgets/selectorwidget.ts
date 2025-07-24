goog.provide('recoil.ui.widgets.SelectorWidget');
goog.require('goog.ui.Container');
goog.require('goog.ui.Control');
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
goog.require('recoil.ui.widgets.LabelWidget');
goog.require('recoil.util');

/**
 *
 * @template T
 * @param {!recoil.ui.WidgetScope} scope
 * @implements {recoil.ui.Widget}
 * @constructor
 */
recoil.ui.widgets.SelectorWidget = function(scope) {
    this.scope_ = scope;
    var frp = this.scope_.getFrp();
    this.container_ = new goog.ui.Container();
    this.readOnlyWidget_ = new recoil.ui.widgets.LabelWidget(scope);
    this.selector_ = new goog.ui.Select(undefined, undefined, undefined, undefined, undefined, function(item) {
        var struct = item.getValue();
        return new struct.renderer(struct.value, struct.valid, struct.enabled);

    });
    // this is to stop leaking dom elements otherwise every time
    // we open a menu it will add the menu to the root document that will
    // not get destroyed unless we manage it ourselves
    this.selector_.setRenderMenuAsSibling(true);

    this.selector_.setScrollOnOverflow(true);

    this.container_.addChild(this.selector_, true);
    this.container_.addChild(this.readOnlyWidget_.getComponent(), true);
    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.selector_, this, this.updateState_);
    // this.changeHelper_ = new recoil.ui.EventHelper(scope, this.selector_, goog.ui.Component.EventType.ACTION);
    this.changeHelper_ = new recoil.ui.EventHelper(scope, this.selector_, goog.ui.Component.EventType.CHANGE);
    this.enabledHelper_ = new recoil.ui.TooltipHelper(scope, this.selector_, this.container_.getElement());
};


/**
 * this has to come before options
 *
 * @param {?} obj
 * @param {boolean} valid
 * @param {!recoil.ui.BoolWithExplanation} enabled
 * @return {!Element}
 * @constructor
 */
recoil.ui.widgets.SelectorWidget.RENDERER = function(obj, valid, enabled) {
    if (typeof(obj) === 'number') {
        obj = '' + obj;
    }
    if (enabled && enabled.reason && enabled.reason()) {
        if (enabled.reason().toString().trim() !== '') {
            return goog.dom.createDom('div', {disabled: true, class: valid ? 'recoil-select-disabled' : 'recoil-error', title: enabled.reason().toString()}, obj);
        }
    }

    return goog.dom.createDom('div', valid ? undefined : 'recoil-error', obj);

};
/**
 * list of functions available when creating a selectorWidget
 */
// recoil.ui.widgets.SelectorWidget.options =  recoil.util.Options('value' , {'!list': [1, 2, 3]}, {'renderer' : recoil.util.widgets.RENDERER},
//     { renderers :['button', 'menu']}, 'enabledItems');
recoil.ui.widgets.SelectorWidget.options = recoil.frp.Util.Options(
    {
        'name' : '',
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
recoil.ui.widgets.SelectorWidget.prototype.getComponent = function() {
    return this.container_;
};

/**
 * @param {recoil.frp.Behaviour<string>|string} nameB
 * @param {recoil.frp.Behaviour<!T>|!T} valueB
 * @param {recoil.frp.Behaviour<!Array<T>>|Array<T>} listB
 * @param {recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>|!recoil.ui.BoolWithExplanation=} opt_enabledB
 * @param {recoil.frp.Behaviour<function(T) : string>| function(T) : string=} opt_rendererB
 * @param {recoil.frp.Behaviour<!Array<recoil.ui.BoolWithExplanation>>=} opt_enabledItemsB
 */
recoil.ui.widgets.SelectorWidget.prototype.attach = function(nameB, valueB, listB, opt_enabledB, opt_rendererB, opt_enabledItemsB) {
    this.attachStruct({name: nameB, value: valueB, list: listB, enabled: opt_enabledB, renderer: opt_rendererB, enabledItems: opt_enabledItemsB});
};

/**
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.SelectorWidget.prototype.attachStruct = function(options) {
    var frp = this.helper_.getFrp();
    var util = new recoil.frp.Util(frp);
    var bound = recoil.ui.widgets.SelectorWidget.options.bind(frp, options);
    // var optionsB = structs.flatten(frp, options);

    // var bound = recoil.ui.widgets.SelectorWidget.options.bind(optionsB);
    // this.nameB_ =  bound.name();

    this.nameB_ = bound.name();
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

    this.helper_.attach(this.nameB_, this.valueB_, this.listB_, this.enabledB_, this.rendererB_,
                        this.enabledItemsB_, this.editableB_);
    const key = recoil.util.object.uniq();

    this.readOnlyWidget_.attachStruct(frp.liftB(
        function(val, renderer) {
            let formatter = function(v) {
                try {
                    return renderer(v, true, false);
                }
                catch (e) {
                    return '';
                }
            };
            return {
                name: val,
                formatter: formatter
            };

    }, this.valueB_, this.rendererB_));

    var me = this;
    this.changeHelper_.listen(this.scope_.getFrp().createCallback(function(v) {

        var idx = v.target.getSelectedIndex();
        var list = me.listB_.get();
        if (idx < list.length) {
            me.valueB_.set(list[idx]);
        }

    }, this.valueB_, this.listB_));
    this.enabledHelper_.attach(
        /** @type {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>} */ (this.enabledB_),
        this.helper_);
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
recoil.ui.widgets.SelectorWidget.createMenuItem_ = function(renderer, val, valid, enabled) {
    var item = new goog.ui.MenuItem(renderer(val, valid, enabled), {value: val, valid: valid, enabled: enabled, renderer: renderer});
    if (enabled && enabled.val && !enabled.val()) {
        item.setEnabled(false);
    }
    return item;
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.SelectorWidget.prototype.updateState_ = function(helper) {

    if (helper.isGood()) {
        // console.log('in selectWidget updateState');
        var list = this.listB_.get();
        var sel = this.selector_;
        var enabledItems = this.enabledItemsB_.get();
        //sel.setEnabled(this.enabledB_.get().val());
        sel.setVisible(this.editableB_.get());
        this.readOnlyWidget_.getComponent().setVisible(!this.editableB_.get());
        var renderer = this.rendererB_.get();


        for (var i = sel.getItemCount() - 1; i >= 0; i--) {
            sel.removeItemAt(i);
        }

        var found = -1;
        if (list) {
            for (i = 0; i < list.length; i++) {
                var val = list[i];
                var enabled = enabledItems.length > i ? enabledItems[i] : recoil.ui.BoolWithExplanation.TRUE;
                sel.addItem(recoil.ui.widgets.SelectorWidget.createMenuItem_(renderer, val, true, enabled));
                if (recoil.util.isEqual(this.valueB_.get(), val)) {
                    found = i;
                }
            }
            if (found === -1) {
                sel.addItem(recoil.ui.widgets.SelectorWidget.createMenuItem_(renderer, this.valueB_.get(), false, recoil.ui.BoolWithExplanation.FALSE));
                found = list.length;
            }

            sel.setSelectedIndex(found);
        }
    }

};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.SelectorWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
