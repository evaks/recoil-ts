goog.provide('recoil.debugger.ObjectBrowser');

goog.require('goog.dom');
goog.require('goog.ui.tree.TreeControl');
goog.require('goog.ui.tree.TreeNode');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.widgets.TreeView');
/**
 * @param {Element} container
 * @param {function(?,?,?)=} opt_menuCreator
 * @param {Window=} opt_window
 * @constructor
 */
recoil.debugger.ObjectBrowser = function(container, opt_menuCreator, opt_window) {
    this.tree_ = new goog.ui.tree.TreeControl('?');
    this.tree_.setShowRootNode(false);
    this.tree_.setShowRootLines(false);
    this.tree_.render(container);
    this.tree_.oldItems = [];
    this.window_ = opt_window || window;
    this.menuCreator_ = opt_menuCreator;
};

/**
 * tries to convert an item into a string if it is not too long
 *
 * @param {?} val the thing to turn into a string
 * @param {string} def what to return if anable to convert to string
 * @return {string}
 */
recoil.debugger.ObjectBrowser.prototype.shortStringify = function(val, def) {
    try {
        var str = JSON.stringify(val);
        if (str.length > 20) {
            return def;
        }
        return str;
    }
    catch (e) {
        return def;
    }
};

/**
 * make the value into a safe html
 * @param {?} val
 * @return {!goog.html.SafeHtml|string}
 */
recoil.debugger.ObjectBrowser.prototype.typeToSafeHtml = function(val) {
    var type = typeof (val);
    if (type === 'number') {
        if (isNaN(val)) {
            return goog.html.SafeHtml.create(
                'div', {class: 'recoil-debugger-number'}, 'NaN');
        }

        if (isNaN(val)) {
            return goog.html.SafeHtml.create(
                'div', {class: 'recoil-debugger-number'}, 'NaN');
        }
        if (isFinite(val)) {
            return goog.html.SafeHtml.create(
                'div', {class: 'recoil-debugger-number'},JSON.stringify(val));
        }

        return goog.html.SafeHtml.create(
            'div', {class: 'recoil-debugger-number'},val < 0 ? '-Infinity' : 'Infinity');

    }
    if (val === null) {
        return goog.html.SafeHtml.create(
            'div', {class: 'recoil-debugger-null'},
            this.shortStringify(val, JSON.stringify(val)));
    }
    if (val === undefined) {
        return goog.html.SafeHtml.create(
            'div', {class: 'recoil-debugger-null'},
            this.shortStringify(val, 'undefined'));
    }
    if (val instanceof this.window_.recoil.frp.Behaviour) {
        var meta = val.unsafeMetaGet();
        var refs = val.hasRefs();
        var res;
        if (meta.good()) {
            res = this.typeToSafeHtml(meta.get());
        }
        else if (meta.errors().length > 0) {
            res = goog.html.SafeHtml.create(
                'div', {class: 'recoil-debugger-behaviour'},
                [
                    goog.html.SafeHtml.create(
                        'div', {class: 'recoil-debugger-behaviour-error'}, 'Error'),
                    this.typeToSafeHtml(meta.errors())]);

        }
        else {
            res = goog.html.SafeHtml.create(
                'div', {class: 'recoil-debugger-behaviour-not-ready'},
                'Not Ready');
        }
        if (!val.hasRefs()) {
            res = goog.html.SafeHtml.create(
                'div', {class: 'recoil-debugger-behaviour'},
                [
                    goog.html.SafeHtml.create(
                        'div', {class: 'recoil-debugger-behaviour-no-ref'}, 'No Ref'),
                    res]);
        }

        return res;

    }
    if (val instanceof this.window_.Array) {
        return goog.html.SafeHtml.create(
            'div', {class: 'recoil-debugger-array'},
            this.shortStringify(val, '[...]'));
    }

    if (val instanceof this.window_.Function) {
        return goog.html.SafeHtml.create(
            'div', {class: 'recoil-debugger-function'},'()');
    }

    if (val instanceof this.window_.Object) {
        return goog.html.SafeHtml.create(
            'div', {class: 'recoil-debugger-object'},
            this.shortStringify(val, '{...}'));
    }


    if (type === 'string') {
        return goog.html.SafeHtml.create(
            'div', {class: 'recoil-debugger-string'},JSON.stringify(val));
    }



    if (type === 'boolean') {
        return goog.html.SafeHtml.create(
            'div', {class: 'recoil-debugger-string'},JSON.stringify(val));
    }

    return '' + val;
};

/**
 * @private
 * @param {?} obj
 * @return {!Array<{name:?, val:?}>}
 */
recoil.debugger.ObjectBrowser.prototype.getChildKeyValues_ = function(obj) {
    var res = [];
    this.getChildKeys_(obj).forEach(function(key) {
        res.push({name: key.aname, val: key(obj)});
    });
    return res;
};

/**
 * @private
 * @param {?} obj
 * @return {!Array<function(?):?>}
 */
recoil.debugger.ObjectBrowser.prototype.getChildKeys_ = function(obj) {
    var getAttr = function(attr) {
        var res = function(obj) {
            return obj[attr];
        };
        res.aname = attr;
        return res;
    };

    var calcAttr = function(attr, func) {
        var res = function(obj) {
            return func(obj);
        };
        res.aname = attr;
        return res;
    };
    var res = [];
    if (obj instanceof this.window_.recoil.frp.Behaviour) {

        res.push(calcAttr('value', function(b) {
            var v = b.unsafeMetaGet();
            return b.unsafeMetaGet().get();
        }));
        res.push(calcAttr('ready', function(b) {
            return b.unsafeMetaGet().ready();
        }));
        if (obj.unsafeMetaGet().errors().length > 0) {
            res.push(calcAttr('errors', function(b) {
                return b.unsafeMetaGet().errors();
            }));
        }
        res.push(calcAttr('name', function(b) {
            return b.name_;
        }));
        res.push(calcAttr('origSeq', function(b) {
            return b.origSeq_;
        }));
        res.push(calcAttr('curSeq', function(b) {
            return b.seqStr_;
        }));
        res.push(calcAttr('providers', function(b) {
            return b.providers_;
        }));
        res.push(calcAttr('dependants', function(b) {
            return b.getDependants();
        }));
    } else if (obj instanceof this.window_.Array) {
        for (var i = 0; i < obj.length; i++) {
            res.push(getAttr('' + i));
        }
        res.push(getAttr('length'));

    }
    else if (obj instanceof this.window_.Object) {
        if (obj instanceof this.window_.Function) {
            res.push(getAttr('arguments'));
            res.push(getAttr('caller'));
            res.push(getAttr('length'));
            res.push(getAttr('name'));
            res.push(getAttr('prototype'));

        }
        for (var k in obj) {
            res.push(getAttr(k));
        }
    }
    return res;

};
/**
 * creates the safe html that goes in a tree node
 * @private
 * @param {string} name
 * @param {?} obj
 * @return {!goog.html.SafeHtml}
 */
recoil.debugger.ObjectBrowser.prototype.createNodeHtml_ = function(name, obj) {
    var suffix = obj instanceof Function ? '' : ':';
    return goog.html.SafeHtml.create(
        'div', {style: {display: 'inline-block'}},
        [
            goog.html.SafeHtml.create('b', undefined, name + suffix),
            this.typeToSafeHtml(obj)

        ]
    );
};
/***
 * @private
 * @param {!goog.ui.tree.BaseNode} node
 * @param {?} obj
 */
recoil.debugger.ObjectBrowser.prototype.updateChildMap_ = function(node, obj) {
    var oldMap = node.childMap || {};
    var map = {};
    var childKeys = this.getChildKeys_(obj);
    for (var i = 0; i < childKeys.length; i++) {
        var k = childKeys[i];
        var childNode = node.getChildAt(i);
        var expanded = (oldMap[k.aname] && oldMap[k.aname].expanded) || node.getExpanded();
        map[k.aname] = {node: childNode, val: k(obj), getter: k, expanded: expanded};

    }
    node.childMap = map;
};


/**
* @constructor
* @extends {goog.ui.tree.TreeNode}
* @param {?function (?, ?, ?)} menuCreator
* @param {!goog.html.SafeHtml} content
* @param {?} obj
* @param {?=} opt_config
* @param {?=} opt_domHelper
*/
recoil.debugger.ObjectBrowser.TreeNode = function(menuCreator, content, obj, opt_config, opt_domHelper) {
    goog.ui.tree.TreeNode.call(this, content, opt_config, opt_domHelper);
    this.objectValue = obj;
    this.menuCreator_ = menuCreator;
};

/** @extends {recoil.debugger.ObjectBrowser.TreeNode} */
goog.inherits(recoil.debugger.ObjectBrowser.TreeNode, goog.ui.tree.TreeNode);

/** @override */
recoil.debugger.ObjectBrowser.TreeNode.prototype.createDom = function() {
    recoil.ui.widgets.TreeNode.superClass_.createDom.call(this);
    if (this.menuCreator_) {
        this.menuCreator_(this.getRowElement(), this.objectValue, this);
    }
};


    /**
 * @private
 * @param {string} name
 * @param {?} obj
 * @param {number} depth
 * @return {recoil.debugger.ObjectBrowser.TreeNode}
 */
recoil.debugger.ObjectBrowser.prototype.createNode_ = function(name, obj, depth) {

    var node = new recoil.debugger.ObjectBrowser.TreeNode(this.menuCreator_ || null,
        this.createNodeHtml_(name, obj), obj);
    var items = [];
    var childMap = {};
    node.childMap = childMap;
    var childKeys = this.getChildKeys_(obj);
    for (var i = 0; i < childKeys.length; i++) {
        var k = childKeys[i];
        items.push({name: k.aname, val: k(obj)});
        if (depth > 0) {
            var child = this.createNode_(k.aname, k(obj), depth - 1);
            node.add(child);
            childMap[k.aname] = {node: child, val: k(obj), getter: k};
        }

    }
    node.oldItems = items;


    var me = this;
    goog.events.listen(node, goog.ui.tree.BaseNode.EventType.BEFORE_EXPAND,
                       function() {
                           for (var childKey in node.childMap) {
                               var child = node.childMap[childKey];
                               if (!child.expanded) {
                                   var keys = me.getChildKeys_(child.val);
                                   for (var i = 0; i < keys.length; i++) {
                                       var key = keys[i];
                                       var val = key(child.val);
                                       child.node.add(me.createNode_(key.aname, val, 1));
                                   }
                                   child.expanded = true;
                               }
                           }
                       });

    return node;
};
/**
 * add an object to the object browser
 * @param {!Array<{name:string,val:?}>} items
 */
recoil.debugger.ObjectBrowser.prototype.setItems = function(items) {
    this.setItemsRec_(this.tree_, items, this.tree_.oldItems);
};
/**
 * @private
 * @param {goog.ui.tree.BaseNode} node
 * @param {!Array<{name:string,val:?}>} items
 * @param {!Array<{name:string,val:?}>} oldItems
 */
recoil.debugger.ObjectBrowser.prototype.setItemsRec_ = function(node, items, oldItems) {

    // old items may have changed in memory since last called
    var diffs = recoil.ui.widgets.TreeView.minDifference(node.oldItems || [], items, function(x, y) {
        return x.name === y.name && x.val === y.val;
    });


    var childIndex = 0;
    for (var idx = 0; idx < diffs.length; idx++) {
        var diff = diffs[idx];
        var childNode = node.getChildAt(childIndex);
        var newPath;
        if (diff.oldVal !== undefined && diff.newVal !== undefined) {
            childNode.setSafeHtml(this.createNodeHtml_(diff.newVal.name, diff.newVal.val));
            if (childNode.getExpanded() || node.getExpanded() || childNode.hasChildren()) {
                this.setItemsRec_(
                    childNode,
                    this.getChildKeyValues_(diff.newVal.val),
                    this.getChildKeyValues_(diff.oldVal.val));
                this.updateChildMap_(childNode, diff.newVal.val);
            }

            childIndex++;
        } else if (diff.newVal === undefined) {
            node.removeChild(childNode);
        } else if (diff.oldVal === undefined) {
            childNode = this.createNode_(diff.newVal.name, diff.newVal.val, 1);
            node.addChildAt(childNode, childIndex);
            childIndex++;
        }
    }
    node.oldItems = items;
};
