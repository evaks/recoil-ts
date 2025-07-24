goog.provide('recoil.debugger.StateWatcher');

goog.require('goog.dom');
goog.require('goog.ui.Zippy');
goog.require('recoil.debugger.ObjectBrowser');

/**
 * @param {recoil.debugger.ui} debuggerUI
 * @param {Element} container
 * @param {?=} opt_window
 * @constructor
 */
recoil.debugger.StateWatcher = function(debuggerUI, container, opt_window) {
    this.window_ = opt_window;
    /**
     * @param {string} name
     * @param {function(?,?,?)=} opt_menuCreator
     * @return {{browser:recoil.debugger.ObjectBrowser, header:Element, body:Element}}
     */
    var makeBrowser = function(name, opt_menuCreator) {
        var res = {
            header: goog.dom.createDom(
                'div', {class: 'recoil-watcher-header'},
                goog.dom.createDom('div', {class: 'recoil-watcher-icon'}), name),
            body: goog.dom.createDom('div', {id: name})
        };

        res.browser = new recoil.debugger.ObjectBrowser(res.body, opt_menuCreator, opt_window);
        return res;
    };
    var me = this;
    this.current_ = makeBrowser('Current Node');
    this.select_ = makeBrowser('Selected Node');
    this.watches_ = makeBrowser('Watching List', function(rowElement, nodeB, treeNode) {
           me.popUpMenu(debuggerUI, rowElement, nodeB, treeNode);
    });
    this.pendingUp_ = makeBrowser('Pending Up');
    this.pendingDown_ = makeBrowser('Pending Down');


    [this.current_, this.select_, this.watches_, this.pendingUp_, this.pendingDown_]
        .forEach(function(info) {
            info.zippy = new goog.ui.Zippy(info.header, info.body);
            container.appendChild(info.header);
            container.appendChild(info.body);
        });
    this.current_.zippy.expand();
};

/**
 * @param {recoil.debugger.ui} debuggerUI
 * @param {Element} rowElement
 * @param {recoil.frp.Behaviour} nodeB
 * @param {goog.ui.tree.TreeNode} treeNode
 * @suppress {accessControls}
 */
recoil.debugger.StateWatcher.prototype.popUpMenu = function(debuggerUI, rowElement, nodeB, treeNode) {

    var pm = new goog.ui.PopupMenu();
    var removeWatch = new goog.ui.MenuItem('Remove ' + nodeB.name_ + nodeB.origSeq_);
    pm.addChild(removeWatch, true);
    goog.events.listen(removeWatch, 'action', function(e) {
        if (e.target === removeWatch) {
            console.log('remove Item in StateWatcher', nodeB.origSeq_);
            debuggerUI.removeWatch(nodeB);
      }
    });

    function offset(el) {
      var rect = el.getBoundingClientRect();
      var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
    }
    pm.render(rowElement);
    goog.events.listen(rowElement, 'contextmenu', function(e) {
        var debuggerDiv = goog.dom.getElement('debuggerDiv');
        var pos = offset(debuggerDiv);
        // pm.showMenu(rowElement, e.clientX - e.offsetX, e.clientY - e.offsetY);

        if (debuggerDiv) {
            pm.showMenu(debuggerDiv, e.clientX - pos.left, e.clientY - pos.top);
        }
        console.log('menu', pos, e, rowElement.parentNode);
    });
};


/**
 * @private
 * @param {!Array<!recoil.frp.Behaviour|{name:string,val:?}>} items
 * @return {!Array<{name:string,val:?}>}
 */
recoil.debugger.StateWatcher.prototype.nameItems_ = function(items) {
    var res = [];
    var me = this;
    items.forEach(function(i) {
        if (i instanceof me.window_.recoil.frp.Behaviour) {
            res.push({name: i.getName(), val: i});
        }
        else {
            res.push(i);
        }
    });
    return res;
};

/**
 * @param {!Array<!recoil.frp.Behaviour|{name:string,val:?}>} curNode
 * @param {!Array<!recoil.frp.Behaviour|{name:string,val:?}>} selectNode
 * @param {!Array<!recoil.frp.Behaviour|{name:string,val:?}>} watches
 * @param {!Array<!recoil.frp.Behaviour>} pendingUp
 * @param {!Array<!recoil.frp.Behaviour>} pendingDown
 */

recoil.debugger.StateWatcher.prototype.setState = function(curNode, selectNode, watches, pendingUp, pendingDown) {
    this.watches_.browser.setItems(this.nameItems_(watches));
    this.current_.browser.setItems([{name: 'current', val: curNode}]);
    this.select_.browser.setItems([{name: 'Select', val: selectNode}]);
    if (pendingUp) {
      this.pendingUp_.browser.setItems(this.nameItems_(pendingUp));
    }
    if (pendingDown) {
      this.pendingDown_.browser.setItems(this.nameItems_(pendingDown));
    }
};
