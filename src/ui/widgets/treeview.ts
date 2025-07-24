goog.provide('recoil.ui.widgets.TreeView');

goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.fx.DragDrop');
goog.require('goog.html.SafeHtml');
goog.require('goog.object');
goog.require('goog.structs.TreeNode');
goog.require('goog.ui.tree.TreeControl');
goog.require('goog.ui.tree.TreeNode');
goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.Frp');
goog.require('recoil.frp.struct');
goog.require('recoil.frp.tree');
goog.require('recoil.structs.Tree');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.WidgetHelper');
goog.require('recoil.ui.util');
goog.require('recoil.ui.widgets.LabelWidget');

/**
 * @param {!recoil.ui.WidgetScope} scope
 * @implements {recoil.ui.Widget}
 * @constructor
 */
recoil.ui.widgets.TreeView = function(scope) {
    var me = this;
    this.scope_ = scope;
    this.componentDiv_ = goog.dom.createDom('div');
    this.component_ = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl(this.componentDiv_);
    /**
     * @private
     * @type {goog.ui.tree.TreeControl}
     *
     */
    this.tree_ = null;
    /**
     * @private
     * @type {recoil.structs.Tree}
     */
    this.oldTree_ = null;
    this.config_ = new recoil.ui.WidgetHelper(scope, this.componentDiv_, this, this.updateConfig_);
    this.state_ = new recoil.ui.WidgetHelper(scope, this.componentDiv_, this, this.updateTree_);
    this.expandHelper_ = new recoil.ui.WidgetHelper(scope, this.componentDiv_, this, this.updateExpand_);
    this.selectedB_ = /** @type {!recoil.frp.Behaviour} **/(scope.getFrp().createB(null));
};

/**
 * @return {!recoil.frp.Behaviour}
 */
recoil.ui.widgets.TreeView.prototype.getSelectedB = function() {
    return this.selectedB_;
};

/**
 * @type {!Object}
 */
recoil.ui.widgets.TreeView.defaultConfig = (function() {
    var res = goog.object.clone(goog.ui.tree.TreeControl.defaultConfig);
    res.showRoot = true;
    res.showLines = true;
    res.showExpandIcons = true;
    res.clickCallback = null;
    return res;
})();
/**
 * scrolls the element into view if not on screen
 * @param {!Element} el
 */
recoil.ui.widgets.TreeView.scrollIfNeeded = function(el) {
    var findScrollableParent = function(el) {
        var cur = el;
        while (cur) {
            if (cur.scrollHeight > cur.clientHeight) {
                var style = getComputedStyle(cur);
                var overflow = style ? style.overflow : undefined;
                if (['auto', 'scroll'].indexOf(overflow) >= 0) {
                    return cur;
                }
            }
            cur = cur.parentElement;
        }
        return null;
    };
    var ancestor = findScrollableParent(el);
    if (ancestor && ancestor.scrollIntoView) {
        var bound = el.getBoundingClientRect();
        var abound = ancestor.getBoundingClientRect();
        if (bound && abound) {
            if (abound.bottom < bound.bottom) {
                el.scrollIntoView(false);
            }
            else if (bound.top < abound.top) {
                el.scrollIntoView(true);

            }
        }
    }
};

/**
 * This creates a TreeControl object. A tree control provides a way to
 * view a hierarchical set of data.
 * @param {string} key
 * @param {string|!goog.html.SafeHtml} content The content of the node label.
 *     Strings are treated as plain-text and will be HTML escaped.
 * @param {Object=} opt_config The configuration for the tree. See
 *    goog.ui.tree.TreeControl.defaultConfig. If not specified, a default config
 *    will be used.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @constructor
 * @extends {goog.ui.tree.TreeNode}
 */

recoil.ui.widgets.TreeNode = function(key, content, opt_config, opt_domHelper) {
    goog.ui.tree.TreeNode.call(this, content, opt_config, opt_domHelper);
    this.key_ = key;
};
goog.inherits(recoil.ui.widgets.TreeNode, goog.ui.tree.TreeNode);


/**
 * Selects the node.
 */
recoil.ui.widgets.TreeNode.prototype.select = function() {
    recoil.ui.widgets.TreeNode.superClass_.select.call(this);
};

/**
 * Handles a key down event.
 * @param {!goog.events.BrowserEvent} e The browser event.
 * @return {boolean} The handled value.
 * @protected
 */
recoil.ui.widgets.TreeNode.prototype.onKeyDown = function(e) {

    var handled = recoil.ui.widgets.TreeNode.superClass_.onKeyDown.call(this, e);
    if (handled && this.getTree().getSelectedItem()) {
        var selected = this.getTree().getSelectedItem();
        if (selected) {
            var el = selected.getRowElement();
            if (el) {
                recoil.ui.widgets.TreeView.scrollIfNeeded(el);
            }
        }
    }
    return handled;
};
/**
 * Handles a click event.
 * @param {!goog.events.BrowserEvent} e The browser event.
 * @protected
 * @suppress {underscore|visibility}
 */
recoil.ui.widgets.TreeNode.prototype.onClick_ = function(e) {
    var el = e.target;
    // expand icon

    if (this.getConfig().clickCallback && this.getConfig().clickCallback(this, e)) {
        return;
    }
    var type = el.getAttribute('type');
    if (type == 'expand' && this.hasChildren()) {
        e.preventDefault();
        return;
    }


    if (this.getConfig().oneClickExpand && this.isUserCollapsible()) {
        if (!this.hasChildren() && e.button === 0) {
            return;
        }

        try {
            this.getTree().userToggle = true;
            this.toggle();
        }
        catch (e) {
            delete this.getTree().userToggle;
        }
    }
    e.preventDefault();
};
/**
 * @return {string}
 */
recoil.ui.widgets.TreeNode.prototype.key = function() {
    return this.key_;
};

/**
 * @return {!Array<string>}
 */
recoil.ui.widgets.TreeNode.prototype.path = function() {
    var res = [this.key_];

    var parent = this.getParent();
    while (parent instanceof recoil.ui.widgets.TreeNode) {
        res.unshift(parent.key());
        parent = parent.getParent();
    }
    return res;
};

/** @override */
recoil.ui.widgets.TreeNode.prototype.createDom = function() {
    var element = this.toDom();
    this.setElementInternal(element);
};


/**
 * Creates HTML for the node.
 * @return {!Element}
 * @protected
 */
recoil.ui.widgets.TreeNode.prototype.toDom = function() {
    var tree = this.getTree();
    var hideLines = !tree.getShowLines() ||
            tree == this.getParent() && !tree.getShowRootLines();
    var config = this.getConfig();
    var childClass =
            hideLines ? config.cssChildrenNoLines : config.cssChildren;

    var nonEmptyAndExpanded = this.getExpanded() && this.hasChildren();

    var attributes = {'class': childClass, 'style': goog.html.SafeStyle.unwrap(this.getLineStyle())};

    var content = [];
    if (nonEmptyAndExpanded) {
        // children
        this.forEachChild(function(child) { content.push(child.toDom()); });
    }

    var children = this.getDomHelper().createDom('div', attributes, content);

    return this.getDomHelper().createDom(
        'div', {'class': config.cssItem, 'id': this.getId()},
        [this.getRowDom(), children]);
};

/**
 * Sets the node to be expanded.
 * @param {boolean} expanded Whether to expand or close the node.
 * @suppress {visibility}
 */
recoil.ui.widgets.TreeNode.prototype.setExpanded = function(expanded) {
    var isStateChange = expanded != this.getExpanded();
    if (isStateChange) {
        // Only fire events if the expanded state has actually changed.
        var prevented = !this.dispatchEvent(
            expanded ? goog.ui.tree.BaseNode.EventType.BEFORE_EXPAND :
                goog.ui.tree.BaseNode.EventType.BEFORE_COLLAPSE);
        if (prevented) return;
    }
    var ce;
    this.setExpandedInternal(expanded);
    var tree = this.getTree();
    var expandOverride = tree.userToggle && this.getConfig().expandOverride;
    var el = this.getElement();

    if (this.hasChildren()) {
        if (!expanded && tree && this.contains(tree.getSelectedItem())) {
            this.select();
        }

        if (el) {
            ce = this.getChildrenElement();
            if (ce) {

                if (!expandOverride) {goog.style.setElementShown(ce, expanded);}
                // Make sure we have the HTML for the children here.
                if (expanded && this.isInDocument() && !ce.hasChildNodes()) {
                    var children = [];
                    this.getDomHelper().removeChildren(ce);
                    this.forEachChild(function(child) {
                        var childEl = child.toDom();
                        children.push(childEl);
                        ce.appendChild(childEl);
                    });

                    this.forEachChild(function(child) { child.enterDocument(); });
                }
                if (expandOverride) {
                    expandOverride(ce, expanded);
                }
            }
            this.updateExpandIcon();
        }
    } else {
        ce = this.getChildrenElement();
        if (ce) {
            goog.style.setElementShown(ce, false);
        }
    }
    if (el) {
        this.updateIcon_();
        goog.a11y.aria.setState(el, 'expanded', expanded);
    }

    if (isStateChange) {
        this.dispatchEvent(
            expanded ? goog.ui.tree.BaseNode.EventType.EXPAND :
                goog.ui.tree.BaseNode.EventType.COLLAPSE);
    }
};
/**
 * @param {goog.ui.Component} component
 */
recoil.ui.widgets.TreeNode.prototype.setDom = function(component) {
    this.component_ = component;
    var el = this.getLabelElement();
    if (el) {
        this.getDomHelper().removeChildren(el);
        component.render(el);

    }
    var tree = this.getTree();
    if (tree) {
        // Tell the tree control about the updated label text.
        tree.setNode(this);
    }
};
/**
 * @return {!Element} The html for the row.
 * @protected
 * @suppress {visibility}
 */
recoil.ui.widgets.TreeNode.prototype.getRowDom = function() {
    var style = {};
    style['padding-' + (this.isRightToLeft() ? 'right' : 'left')] =
        this.getPixelIndent_() + 'px';
    var attributes = {'class': this.getRowClassName(), 'style': goog.html.SafeStyle.unwrap(goog.html.SafeStyle.create(style))};
    var dh = this.getDomHelper();
    var content = [
        dh.safeHtmlToNode(this.getExpandIconSafeHtml()), dh.safeHtmlToNode(this.getIconSafeHtml()),
        this.getLabelDom(),
        dh.safeHtmlToNode(goog.html.SafeHtml.create('span', {}, this.getAfterLabelSafeHtml()))
    ];
    return this.getDomHelper().createDom('div', attributes, content);
};

/**
 * fixes bug where the folder icon is not updated
 * @override
 * @suppress {visibility}
 */
recoil.ui.widgets.TreeNode.prototype.addChildAt = function(
    child, index, opt_render) {
    var hadChildren = this.hasChildren();
    recoil.ui.widgets.TreeNode.superClass_.addChildAt.call(this, child, index);
    if (!hadChildren && this.getIconElement()) {
        this.updateIcon_();
    }
};
/**
 * @return {!Element}
 */
recoil.ui.widgets.TreeNode.prototype.getLabelDom = function() {
    var el;

    var res = this.getDomHelper().createDom(
        'span',
        {'class': this.getConfig().cssItemLabel || null});
    if (this.component_) {
        el = this.component_.getElement();
        if (el) {
            this.getDomHelper().removeNode(el);
            res.appendChild(el);
        }
        else {
            this.component_.render(el);
        }

    }
    else {
        res.appendChild(this.getDomHelper().safeHtmlToNode(this.getSafeHtml()));
    }
    return res;
};

/**
 * @param {!recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour} nodeB
 * @return {recoil.ui.Widget}
 */
recoil.ui.widgets.TreeView.defaultNodeFactory = function(scope, nodeB) {
    var widget = new recoil.ui.widgets.LabelWidget(scope);
    widget.attach(nodeB);
    return widget;
};
/**
 * callback handler that gets called when the configuration for the widget
 * gets changed
 *
 * @private
 * @param {!recoil.ui.WidgetHelper} helper
 */
recoil.ui.widgets.TreeView.prototype.updateConfig_ = function(helper) {
    var me = this;
    var good = helper.isGood();

    if (good) {
        if (me.tree_ !== null) {
            goog.dom.removeChildren(this.componentDiv_);
        }
        var treeConfig = helper.value();
        me.oldValue_ = undefined;
        me.tree_ = new goog.ui.tree.TreeControl('root', treeConfig);
        me.tree_.listen(goog.events.EventType.CHANGE, function(e) {
            var item = me.tree_.getSelectedItem();
            var path = [];
            var cur = item;

            while (cur && cur.key_) {
                path.unshift(cur.key_);
                cur = cur.getParent();
            }
            if (me.oldValue_) {
                this.scope_.getFrp().accessTrans(
                    function() {
                        if (item) {
                            me.selectedB_.set({path: path, value: me.oldValue_.getValue(path)});
                        }
                        else {
                            me.selectedB_.set(null);
                        }
                    }, me.selectedB_);
            }

        }, false, this);

        // now force the tree to re-render since we just destroyed
        me.tree_.setShowRootNode(treeConfig.showRoot === undefined || treeConfig.showRoot);
        me.tree_.setShowLines(treeConfig.showLines === undefined || treeConfig.showLines);
        me.tree_.setShowExpandIcons(treeConfig.showExpandIcons === undefined || treeConfig.showExpandIcons);
        me.tree_.render(me.componentDiv_);
        me.nodeFactory_ = treeConfig.nodeFactory_ || treeConfig.nodeFactory || recoil.ui.widgets.TreeView.defaultNodeFactory;
        // and created a new one
        me.state_.forceUpdate();
    } else if (me.tree_ !== null) {
        goog.dom.removeChildren(this.componentDiv_);
        me.tree_ = null;
        me.state_.forceUpdate();
    }

};
/**
 * @private
 */
recoil.ui.widgets.TreeView.prototype.clearErrors_ = function() {
    var children = goog.dom.getChildren(this.componentDiv_);
    //backwards because we may delete
    for (var i = children.length - 1; i >= 0; i--) {
        var child = children[i];
        if (goog.dom.classlist.contains(child, 'error')) {
            this.componentDiv_.removeChild(child);
        }
    }

};

/**
 * @private
 * @param {recoil.ui.WidgetHelper} helper
 */
recoil.ui.widgets.TreeView.prototype.addErrors_ = function(helper) {
    var me = this;
    helper.errors().forEach(function(error) {
        var div = goog.dom.createDom('div', {class: 'error'}, goog.dom.createTextNode(error.toString()));
        div.onclick = function() {
            console.error('Error was', error);
        };
        me.componentDiv_.appendChild(
            div);

    });
};
/**
 * @private
 * updates the expanded behaviour from the tree
 */
recoil.ui.widgets.TreeView.prototype.updateExpanded_ = function() {
    var me = this;
    var expandedB = this.expandedB_;
    if (!this.tree_) {
        return;
    }

    var getExpandedRec = function(node, expandedSet) {
        node.forEachChild(function(child) {
            if (child.getExpanded() && child.hasChildren()) {
                var childExpanded = {};
                getExpandedRec(child, childExpanded);
                expandedSet[child.key()] = childExpanded;
            }
        });
    };
    this.scope_.getFrp().accessTrans(
        function() {
            var expanded = {};
            getExpandedRec(me.tree_, expanded);
            expandedB.set({internal: true, expanded: expanded});
        }, expandedB);
};

/**
 * @private
 * @param {recoil.ui.WidgetHelper} helper
 * @param {!recoil.frp.Behaviour<{expanded:(Object|boolean),internal:(undefined|boolean)}>} newValueB
 */
recoil.ui.widgets.TreeView.prototype.updateExpand_ = function(helper, newValueB) {
    if (!helper.isGood() || newValueB.get().internal) {
        return;
    }
    var setExpandedRec = function(node, expanded) {
        node.setExpanded(expanded);

    };
    if (this.tree_ && this.treeSet_) {
        var newValue = newValueB.get();
        try {
            this.blockExpandEvents_ = true;
            if (newValue.expanded === true || newValue.expanded === false) {
                if (newValue.expanded) {
                    this.tree_.expandAll();
                }
                else {
                    this.tree_.collapseAll();
                }
            }
            else {
                var expandRec = function(node, expandSet) {
                    node.forEachChild(function(child) {
                        if (child.hasChildren()) {
                            child.setExpanded(!!(expandSet && expandSet[child.key()]));
                            if (expandSet) {
                                expandRec(child, expandSet[child.key()]);
                            }
                            else {
                                expandRec(child, undefined);
                            }
                        }
                        else {
                            child.setExpanded(false);
                        }
                    });
                };
                expandRec(this.tree_, newValue.expanded);
            }
            this.updateExpanded_();
        }
        finally {
            this.blockExpandEvents_ = false;
        }

    }
};
/**
 * @private
 * @param {recoil.ui.WidgetHelper} helper
 * @param {!recoil.frp.Behaviour<recoil.structs.Tree>} newValue
 */
recoil.ui.widgets.TreeView.prototype.updateTree_ = function(helper, newValue) {
    var good = helper.isGood();

    // clear out errors
    var me = this;
    this.clearErrors_();
    this.treeSet_ = false;
    if (this.tree_ !== null) {
        if (good) {
            this.populateTreeRec_(null, this.tree_, [], this.oldValue_, newValue.get());
            this.treeSet_ = true;
            this.oldValue_ = newValue.get();
            this.expandHelper_.forceUpdate();
        } else {
            this.addErrors_(helper);
        }
    }
    else {
        this.addErrors_(helper);
    }
};

/**
 * attachable behaviours for widget
 */
recoil.ui.widgets.TreeView.options = recoil.ui.util.StandardOptions(
    'state', {config: recoil.ui.widgets.TreeView.defaultConfig});
/**
 * @param {!recoil.frp.Behaviour<Object>|!Object} options
 * @param {!recoil.frp.Behaviour<{expanded:Object,internal:(boolean|undefined)}>=} opt_expandedB
 */
recoil.ui.widgets.TreeView.prototype.attach = function(options, opt_expandedB) {
    var frp = this.scope_.getFrp();

    var bound = recoil.ui.widgets.TreeView.options.bind(frp, options);

    this.configB_ = bound.config();
    this.stateB_ = bound.state();
    this.expandedB_ = opt_expandedB || frp.createB({internal: true, expanded: {}});

    this.config_.attach(this.configB_);
    this.state_.attach(this.stateB_);
    this.expandHelper_.attach(this.expandedB_);

};
/**
 * tests if the values of the nodes are the same
 * @private
 * @param {recoil.structs.Tree} a
 * @param {recoil.structs.Tree} b
 * @return {boolean}
 */
recoil.ui.widgets.TreeView.same_ = function(a, b) {
    return recoil.util.isEqual(a.key(), b.key());
};
/**
 * @param {string} key
 * @return {!recoil.ui.widgets.TreeNode}
 */
recoil.ui.widgets.TreeView.prototype.createNode = function(key) {
    //    return this.tree_.createNode('');

    var node = new recoil.ui.widgets.TreeNode(key, 'blank',
                                              this.tree_.getConfig(), this.tree_.getDomHelper());
    node.listen(goog.ui.tree.BaseNode.EventType.EXPAND, this.expandListener_, false, this);
    node.listen(goog.ui.tree.BaseNode.EventType.COLLAPSE, this.expandListener_, false, this);
    return node;
};
/**
 * @param {?} e
 * @private
 */
recoil.ui.widgets.TreeView.prototype.expandListener_ = function(e) {
    if (this.blockExpandEvents_) {
        return;
    }
    this.updateExpanded_();
};

/**
 * @param {goog.ui.tree.BaseNode} node
 * @param {recoil.ui.Widget} widget
 */
recoil.ui.widgets.TreeView.prototype.setNodeContent = function(node, widget) {
    if (node.setDom) {
        node.setDom(widget.getComponent());
    }
};

/**
 * @private
 * @param {goog.ui.tree.BaseNode} parent
 * @param {goog.ui.tree.BaseNode} node
 * @param {!Array<string>} path
 * @param {recoil.structs.Tree} oldValue
 * @param {recoil.structs.Tree} newValue
 */
recoil.ui.widgets.TreeView.prototype.populateTreeRec_ = function(parent, node, path, oldValue, newValue) {
    // var numChildren = getNumChildren(parentValue);
    // var oldNumChildren = getNumChildren(oldValue);;

    if (oldValue === newValue) {
        return;
    }
    var me = this;
    if (newValue === null || newValue === undefined) {
        if (node) {
            parent.removeChild(node);
        }
        return;
    }
    else if (oldValue === undefined || oldValue === null) {
        this.setNodeContent(node, this.nodeFactory_(me.scope_, recoil.frp.tree.getValueB(me.stateB_, path), node));
        newValue.children().forEach(function(child) {
            var newNode = me.createNode(child.key());
            var newPath = goog.array.clone(path);
            newPath.push(child.key());
            me.populateTreeRec_(node, newNode, newPath, null, child);
            // we have to add after otherwise the folder icon is incorrect
            node.addChild(newNode);
        });
        return;
    }
    else if (recoil.util.isEqual(oldValue.key(), newValue.key())) {
        // do nothing
    }
    else {
        this.setNodeContent(node, this.nodeFactory_(me.scope_, recoil.frp.tree.getValueB(me.stateB_, path), node));
    }

    var differences = recoil.ui.widgets.TreeView.minDifference(oldValue.children(), newValue.children(), recoil.ui.widgets.TreeView.same_);

    var childIndex = 0;
    for (var idx = 0; idx < differences.length; idx++) {
        var diff = differences[idx];
        var childNode = node.getChildAt(childIndex);
        var newPath;
        if (diff.oldVal !== undefined && diff.newVal !== undefined) {
            newPath = goog.array.clone(path);
            newPath.push(diff.newVal.key());
            this.populateTreeRec_(node, childNode, newPath, diff.oldVal, diff.newVal);
            childIndex++;
        } else if (diff.newVal === undefined) {
            node.removeChild(childNode);
        } else if (diff.oldVal === undefined) {
            newPath = goog.array.clone(path);
            newPath.push(diff.newVal.key());
            childNode = me.createNode(diff.newVal.key());
            node.addChildAt(childNode, childIndex);
            childIndex++;
            this.populateTreeRec_(node, childNode, newPath, undefined, diff.newVal);
        }
    }

};

/*
 * (function( $, undefined ) { $.extend($.ui, { treeview: { version: "0.0.1" } });
 *
 * var PROP_NAME = "treeview";
 *
 *
 * function getNumChildren(value) { if (value === undefined) { return 0; } return value.children === undefined ? 0 :
 * value.children.length; }
 *
 * function cloneArray(start, arr) { var res = [];
 *
 * for (var i = start; i <arr.length; i++) { res.push(arr[i]); }
 *
 * return res; }
 *
 * function cloneAndAppend(arr, val) { var res = cloneArray(0, arr); res.push(val); return res; }
 *
 * function shallowCopy(object) { if (object instanceof Array) { var x = cloneArray(0, object); return x; } var res =
 * {}; for (var i in object) { res[i] = object[i]; } return res; } function setTreeValue(tree, path, setter) { if
 * (path.length === 0) { return tree; } if (!sameVal(path[0], tree)) { return tree; }
 *
 * var res = shallowCopy(tree); res.children = [];
 *
 * if (path.length === 1 ) { setter(res); }
 *
 *
 * var newPath = cloneArray(1, path); for (var i = 0; i < tree.children.length; i++) {
 * res.children.push(setTreeValue(tree.children[i], newPath, setter)); }
 *
 * return res;
 *  } function same(x, y) { if (x === undefined && y == undefined) { return true; } if (x === undefined || y ==
 * undefined) { return false; } return x.expanded === y.expanded && x.icon === y.icon && x.value === y.value; }
 *
 * function sameVal(x, y) { if (x === undefined && y == undefined) { return true; } if (x === undefined || y ==
 * undefined) { return false; } return x.icon === y.icon && x.value === y.value; }
 *
 */
/**
 * this is a minimum edit distance algorithm,
 *
 * the edit types are currently insert, delete, (no modify operation, you must parameterise this in order to use it)
 *
 * the result is a list of objects in the form of {oldValue:? , newValue:?}
 *
 * if both are defined then no change, if only oldValue is defined, it was a delete, if only newValue is defined, it was
 * an insert
 *
 * isEqual is a function that takes 2 items and return if 2 items in the input list are equal.
 * @param {!Array<?>} origList
 * @param {!Array<?>} newList
 * @param {function (?,?) : boolean} isEqual
 * @return {!Array<Object>}
 */

recoil.ui.widgets.TreeView.minDifference = function(origList, newList, isEqual) {

    function createDiffGrid(origList, newList, isEqual) {

        var grid = [];
        for (var i = 0; i <= origList.length; i++) {
            grid[i] = [];
            grid[i][0] = {
                val: i
            };
            if (i !== 0) {
                grid[i][0].oldVal = origList[i - 1];
                grid[i][0].i = i - 1;
                grid[i][0].j = 0;
            }

        }

        for (var i = 0; i <= newList.length; i++) {
            grid[0][i] = {
                val: i
            };
            if (i !== 0) {
                grid[0][i].newVal = newList[i - 1];
                grid[0][i].i = 0;
                grid[0][i].j = i - 1;
            }
        }

        for (var i = 1; i <= origList.length; i++) {
            for (var j = 1; j <= newList.length; j++) {
                if (isEqual(origList[i - 1], newList[j - 1]) && grid[i - 1][j - 1].val <= grid[i - 1][j].val && grid[i - 1][j - 1].val <= grid[i][j - 1].val) {
                    grid[i][j] = {
                        val: grid[i - 1][j - 1].val,
                        oldVal: origList[i - 1],
                        newVal: newList[j - 1],
                        i: i - 1,
                        j: j - 1
                    };
                } else if (grid[i][j - 1].val < grid[i - 1][j].val) {
                    grid[i][j] = {
                        val: grid[i][j - 1].val + 1,
                        newVal: newList[j - 1],
                        i: i,
                        j: j - 1
                    };
                } else {
                    grid[i][j] = {
                        val: grid[i - 1][j].val + 1,
                        oldVal: origList[i - 1],
                        i: i - 1,
                        j: j
                    };
                }
            }
        }
        return grid;
    }

    var grid = createDiffGrid(origList, newList, isEqual);

    var res = [];
    var i = origList.length;
    var j = newList.length;

    while (i !== 0 || j !== 0) {
        var g = grid[i][j];
        if (g.newVal == undefined) {
            res.push({
                oldVal: g.oldVal
            });
        } else if (g.oldVal == undefined) {
            res.push({
                newVal: g.newVal
            });
        } else {
            res.push({
                newVal: g.newVal,
                oldVal: g.oldVal
            });
        }

        i = g.i;
        j = g.j;

    }
    res.reverse();
    return res;

};

/**
 * @param {!recoil.frp.Frp} frp
 * @param {string} key
 * @param {string} version
 * @param {?=} opt_defaultExpanded
 * @return {!recoil.frp.Behaviour}
 */
recoil.ui.widgets.TreeView.createExpanded = function (frp, key, version, opt_defaultExpanded) {
    let defaultExpanded = opt_defaultExpanded || {};
    
    let expandedInternalB = frp.createB(false);
    var expandedStoreB = recoil.ui.frp.LocalBehaviour.createSessionLocal(
        frp, version , key, defaultExpanded);

    return frp.liftBI(
        function(store, internal) {
            if (internal) {
                return {internal: true, expanded: store};
            }
            return {expanded: store};
        }, function(val) {
            expandedInternalB.set(!!val.internal);
            expandedStoreB.set(val.expanded);
            
        }, expandedStoreB, expandedInternalB);
    
};
/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.TreeView.prototype.getComponent = function() {
    return this.component_;
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 */

recoil.ui.widgets.TreeView.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
