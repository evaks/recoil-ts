/**
 */

goog.provide('recoil.debugger.ui');

goog.require('goog.debug.DivConsole');
goog.require('goog.debug.Trace');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.graphics');
goog.require('goog.graphics.Font');
goog.require('goog.graphics.Path');
goog.require('goog.graphics.paths');
goog.require('goog.positioning.Corner');
goog.require('goog.style');
goog.require('goog.ui.Container');
goog.require('goog.ui.Control');
goog.require('goog.ui.LabelInput');
goog.require('goog.ui.Popup');
goog.require('goog.ui.PopupMenu');
goog.require('goog.ui.SubMenu');

goog.require('recoil.debugger.StateWatcher');
goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.Util');
goog.require('recoil.frp.struct');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.WidgetHelper');
goog.require('recoil.ui.WidgetScope');
goog.require('recoil.ui.events');


/**
 * @param {!recoil.ui.WidgetScope} scope
 * @param {Element=} opt_container
 * @param {Window=} opt_window
 * @param {number=} opt_width
 * @param {number=} opt_height
 * @param {Object=} opt_openNodes
 * @constructor
 * @suppress {deprecated}
 */
recoil.debugger.ui = function(scope, opt_container, opt_window, opt_width, opt_height, opt_openNodes) {
    this.height_ = opt_height === undefined ? 1500 : opt_height;
    this.width_ = opt_width === undefined ? 1500 : opt_width;
    this.container = opt_container === undefined ? goog.dom.getElement('debuggerMap') : opt_container;
    this.openNodes = opt_openNodes === null ? [] : opt_openNodes;

    this.scope_ = scope;
    this.window_ = opt_window;
    this.frp_ = scope.getFrp();
    this.dependancyMap = this.frp_.tm().dependancyMap_;
    this.breakPoints = {};
    this.rootNodes = null;
    this.selectedRootNodes = {};
    this.behaviors = {};
    this.dependancyMap = {};
    this.nodeTreeMap = {};
    this.currentNode = [];
    this.selectNode = [];
    this.watchingList = [];
    this.pendingUp = [];
    this.pendingDown = [];

    this.scaleNum = 1;
    this.xOffset = 0;
    this.yOffset = 0;
    this.fill = new goog.graphics.SolidFill('lightgrey');
};


/**
*open the debugger UI on a popup window
* @param {!recoil.ui.WidgetScope} scope
*/
recoil.debugger.ui.openUI = function(scope) {
    var debugger_ = recoil.debugger.ui.debugger_;
    if (!debugger_ || debugger_.closed) {
        debugger_ = window.open('/resources/images/debugger.html', 'debugger', 'width=900, height =' + screen.height);
        debugger_.addEventListener('load', function() {
            var container = debugger_.document.getElementById('debuggerMap');
            debugger_.document.init(scope, window, container);
        }, false);

        debugger_.addEventListener('beforeunload', function() {
            console.log('Closing debugger UI');
            this.map = window.document.debuggerMap;
            if (this.map) {
              this.map.saveNodeInfo();
              this.map.saveWatcherInfo();
              this.map.finishExecute();
            }
        }, false);
        recoil.debugger.ui.debugger_ = debugger_;

    }else {
        debugger_.close();
        recoil.debugger.ui.debugger_ = null;
        recoil.debugger.ui.openUI(scope);
    }

    window.addEventListener('beforeunload', function() {
        debugger_.close();
        recoil.debugger.ui.debugger_ = null;
    });
};


/**
*initialise the UI of debugger.
*/
recoil.debugger.ui.prototype.initialiseUI = function() {
    this.loadStoredData();
    this.getRootNodes();
    this.dragListener_ = new recoil.debugger.ui.DragListener(this);
    this.header_ = this.createHeader();
    this.container.appendChild(this.header_);
    this.debuggerMap_ = this.initialMap();
    if (this.watcherInfo) {
        this.reloadWatcher(this.watcherInfo);
    }
};


/**
*Load the data stored in the localStorage
*/
recoil.debugger.ui.prototype.loadStoredData = function() {
    var openNodes = [];
    var watcherInfo = {};
    try {
        var storedNodes = this.window_.localStorage.getItem('debugger.openNodes');
        if (storedNodes) {
            openNodes = JSON.parse(storedNodes);
        }
        var storedWacher = this.window_.localStorage.getItem('debugger.watcherInfo');
        if (storedWacher) {
            watcherInfo = JSON.parse(storedWacher);
        }
    }
    catch (e) {
        console.log('error', e);
    }
    this.openNodes = openNodes;
    this.watcherInfo = watcherInfo;
    window.opener.document.debuggerMap = this.map;
};


/**
* Create header in the top of Debugger UI
* @return {Element} header
*/
recoil.debugger.ui.prototype.createHeader = function() {
    var header = goog.dom.createDom('header', {'class': 'recoil-debugger-header row'});
    var branding = goog.dom.createDom('div', {'class': 'branding'});
    var name = goog.dom.createDom('div', {'id': 'recoil-debugger-header-name', 'class': 'layout_device_name'}, 'FRP Debugger Tool');
    this.controlIcons = goog.dom.createDom('div', {'id': 'controlIcons', 'class': 'recoil-debugger-controlB'});
    this.debuggerButtons = goog.dom.createDom('div', {'id': 'debuggerButtons', 'class': 'recoil-debugger-debuggerButtons'});
    branding.appendChild(name);
    header.appendChild(branding);
    header.appendChild(this.controlIcons);
    header.appendChild(this.debuggerButtons);
    return header;
};


/**
 *debugger UI
 * @private
 */
recoil.debugger.ui.debugger_ = null;


/**
 *Select the debug target widget by pressing ctrl key and mouse.
 */
recoil.debugger.ui.prototype.selectTarget = function() {
    var me = this;
    window.opener.document.body.addEventListener('mousemove', function(evt) {
        if (evt.ctrlKey) {
            var observer = me.scope_.getObserver();
            var cur = evt.target;
            var behaviors = {};

            observer.getBehaviours(cur, behaviors);
            me.resetDebugger(behaviors);
            if (Object.keys(behaviors).length > 0) {
                me.changeInfoLabel(cur.outerHTML);
            }else {
                me.changeInfoLabel('');
            }
        }
    });
};


/**
*initialise the debugger map in the Debugger UI
* @return {Element}
* @suppress {deprecated}
*/
recoil.debugger.ui.prototype.initialMap = function() {
    var frp = this.frp_;
    var $ = goog.dom.getElement;

    this.dependancyMap = frp.tm().dependancyMap_;
    this.debuggerDiv = goog.dom.createDom('div', {'id': 'debuggerDiv', 'class': 'recoil-debugger row'});
    this.container.appendChild(this.debuggerDiv);
    this.infoLabel = goog.dom.createDom('div', {'id': 'infoLabel', 'class': 'recoil-debugger-controlB-info row'});
    this.mapDiv = goog.dom.createDom('div', {'id': 'mapDiv', 'class': 'columnM'});
    this.toolDiv_ = goog.dom.createDom('div', {'id': 'toolDiv', 'class': 'columnI'});
    $(this.debuggerDiv).appendChild(this.infoLabel);
    $(this.debuggerDiv).appendChild(this.mapDiv);
    $(this.debuggerDiv).appendChild(this.toolDiv_);

    this.mapSvg = new goog.graphics.SvgGraphics(this.width_, this.height_);
    this.mapSvg.createDom();
    goog.dom.setProperties(this.mapSvg.getElement(), {'id': 'mapViewSvg', 'viewBox': '0, 0, 1500,1500',
    'oncontextmenu': 'return false;'});
    this.mapViewSvg = document.getElementById('mapViewSvg');
    this.mapViewG_ = this.mapSvg.createGroup();
    goog.dom.setProperties(this.mapViewG_.getElement(), {'id': 'mapViewGroup'});

    this.initialiseWatcher();
    this.createControlIcons();
    this.drawMainG(this.mapSvg);
    this.drawNodeTree();

    this.mapSvg.render($(this.mapDiv));
    this.debugger_ = new recoil.debugger.ui.Debugger(this);

    return this.debuggerDiv;
};


/**
 *Initialise StateWatcher in the information browser.
 */
recoil.debugger.ui.prototype.initialiseWatcher = function() {

    this.watcher = new recoil.debugger.StateWatcher(this, this.toolDiv_, this.window_);
    this.watcher.setState(this.currentNode, this.selectNode, this.watchingList,
       this.pendingUp, this.pendingDown);
};


/**
 *reload StateWatcher in the information browser.
 * @param {Object} watcherInfo
 */
recoil.debugger.ui.prototype.reloadWatcher = function(watcherInfo) {
    var me = this;

    if (watcherInfo.selectNodeSeq) {
      this.selectNode = this.behaviors[watcherInfo.selectNodeSeq];
    }else {
      this.selectNode = [];
    }
    if (watcherInfo.watchingList && watcherInfo.watchingList.length > 0) {
      watcherInfo.watchingList.forEach(function(nodeSeq) {
          if (me.behaviors[nodeSeq]) {
              me.watchingList.push(me.behaviors[nodeSeq]);
          }
      });
    }else {
      me.watchingList = [];
    }
    this.watcher.setState(this.currentNode, this.selectNode,
    this.watchingList, this.pendingUp, this.pendingDown);
};


/**
 *Add control icons used to control debugger map and debugger into the header.
 */
recoil.debugger.ui.prototype.createControlIcons = function() {
// Icons in the left side of header.
    while (this.controlIcons.firstChild) {
      this.controlIcons.removeChild(this.controlIcons.firstChild);
    }
    var me = this;
    var defaultClass = 'material-icons md-light';
    this.addIcon(function() {
        me.zoomIn();
    }, me.controlIcons, 'add_circle_outline', defaultClass, 'Zoom In');
    this.addIcon(function() {
        me.zoomOut();
    }, me.controlIcons, 'remove_circle_outline', defaultClass, 'Zoom Out');
    this.addIcon(function() {
        me.resetNodesColor();
    }, me.controlIcons, 'format_color_reset', defaultClass, 'Reset Color');
    this.addIcon(function() {
        me.resetDebugger([]);
    }, me.controlIcons, 'refresh', defaultClass, 'Reset Debugger');
    this.addIcon(function() {
        me.selectTarget();
        me.changeInfoLabel('Press Ctrl and move mouse to select debugger target.');
    }, me.controlIcons, 'bug_report', defaultClass, 'Select Target');

// Icons in the right side of header.
    while (this.debuggerButtons.firstChild) {
      this.debuggerButtons.removeChild(this.debuggerButtons.firstChild);
    }
    var inactive = 'material-icons md-light md-inactive';
    this.stepIntoButton_ = this.addIcon(function() {
        me.debugger_.stepInto_ = true;
        me.debugger_.stepOver_ = false;
        me.frp_.tm().resume();
    }, me.debuggerButtons, 'arrow_downward', inactive, 'Step Into');

    this.stepOverButton_ = this.addIcon(function() {
        me.debugger_.stepInto_ = false;
        me.debugger_.stepOver_ = true;
        me.debugger_.pause_ = false;
        me.frp_.tm().resume();
    }, me.debuggerButtons, 'redo', inactive, 'Step Over');

    this.continueButton_ = this.addIcon(function() {
        me.continueButton_.classList.add('md-active');
        var slowCheckBox = goog.dom.getElement('slow');
        me.debugger_.stepInto_ = false;
        me.debugger_.stepOver_ = false;
        me.debugger_.pause_ = false;
        if (slowCheckBox.checked) {
            me.debugger_.start_ = false;
            me.frp_.tm().resume();
        }else {
            me.debugger_.start_ = true;
            me.frp_.tm().resume();
        }
    }, me.debuggerButtons, 'play_arrow', inactive, 'Start Run');

    var slowRun = goog.dom.createDom('input', {'type': 'checkbox', 'id': 'slow', 'name': 'slow'});
    var label = goog.dom.createDom('label', {'class': 'recoil-debugger-label-slow',
    'for': 'slow', 'style': 'font-weight: bold;'}, 'Slow run');
    me.debuggerButtons.appendChild(slowRun);
    me.debuggerButtons.appendChild(label);

    this.addIcon(function() {
        me.continueButton_.classList.remove('md-active');
        me.debugger_.pause_ = true;
        me.debugger_.start_ = false;
    }, me.debuggerButtons, 'pause', defaultClass, 'Pause');

    this.addIcon(function() {
        me.continueButton_.classList.remove('md-active');
        me.continueButton_.classList.add('md-inactive');
        me.debugger_.finish_ = true;
        me.frp_.tm().resume();
        me.debugger_.start_ = false;
        me.debugger_.pause_ = true;
        me.debugger_.finish_ = false;
    }, me.debuggerButtons, 'stop', defaultClass, 'Stop');
};


/**
 *Create a icon and attach it into the container.
 * @param {Function} func
 * @param {Element} container
 * @param {string} icon
 * @param {string} iconClass
 * @param {string} name
 * @return {Element} icon
 */
recoil.debugger.ui.prototype.addIcon = function(func, container, icon, iconClass, name) {
    var iconDiv = goog.dom.createDom('i', {'class': iconClass, 'title': name}, icon);
    iconDiv.addEventListener('click', func);
    container.appendChild(iconDiv);
    return iconDiv;
};


/**
 * Change the content of infoLabel.
 * @param {string} content
 */
recoil.debugger.ui.prototype.changeInfoLabel = function(content) {
    this.infoLabel.textContent = content;
};


/**
 *Zoom in the debugger map.
 */
recoil.debugger.ui.prototype.zoomIn = function() {
    var me = this;
    me.scaleNum -= 0.2;
    if (!me.mapViewSvg) {
        me.mapViewSvg = document.getElementById('mapViewSvg');
    }
    me.mapViewSvg.setAttributeNS(null, 'viewBox', me.xOffset + ',' + me.yOffset + ','
        + me.width_ * me.scaleNum + ',' + me.height_ * me.scaleNum);

};


/**
 *Zoom out the debugger map.
 */
recoil.debugger.ui.prototype.zoomOut = function() {
    var me = this;
    me.scaleNum += 0.2;
    if (!me.mapViewSvg) {
        me.mapViewSvg = document.getElementById('mapViewSvg');
    }
    me.mapViewSvg.setAttributeNS(null, 'viewBox', me.xOffset + ',' + me.yOffset + ','
        + me.width_ * me.scaleNum + ',' + me.height_ * me.scaleNum);

};


/**
 *Finish the debugger execution
 */
recoil.debugger.ui.prototype.finishExecute = function() {
    this.debugger_.finish_ = true;
    this.frp_.tm().resume();
    this.debugger_.finish_ = false;
};


/**
 *clean the localStorage and reset the debugger
 * @param {Object=} opt_rootNodes
 */
recoil.debugger.ui.prototype.resetDebugger = function(opt_rootNodes) {
    console.log('resetDebugger');
    this.finishExecute();
    if (this.window_.localStorage) {
        this.window_.localStorage.removeItem('debugger.openNodes');
        this.window_.localStorage.removeItem('debugger.watcherInfo');
    }
    this.watcherInfo = {'selectNodeSeq': null, 'watchingList': []};
    this.currentNode = {};
    this.openNodes = [];
    this.nodeTreeMap = {};
    this.breakPoints = {};
    this.debugger_.breakPoints = {};
    this.selectedRootNodes = opt_rootNodes;
    this.scaleNum = 1;
    this.xOffset = 0;
    this.yOffset = 0;
    this.mapViewG_.clear();
    this.mapViewG_ = this.mapSvg.createGroup();
    goog.dom.setProperties(this.mapViewG_.getElement(), {'id': 'mapViewGroup'});
    this.drawMainG(this.mapSvg);
    this.drawNodeTree();
    this.reloadWatcher(this.watcherInfo);

};


/**
 *Paused the debugger tracing.
 * @param {boolean} paused
 */
recoil.debugger.ui.prototype.setPaused = function(paused) {
    if (paused) {
        this.continueButton_.classList.remove('md-inactive');
        this.stepOverButton_.classList.remove('md-inactive');
        this.stepIntoButton_.classList.remove('md-inactive');
    }else {
        this.stepOverButton_.classList.add('md-inactive');
        this.stepIntoButton_.classList.add('md-inactive');
    }

};


/**
 *A constructor of Debugger.
 * @param {recoil.debugger.ui} me
 * @implements {recoil.frp.Debugger}
 * @constructor
 */
recoil.debugger.ui.Debugger = function(me) {
    this.widget_ = me;
    this.nodeTreeMap_ = me.nodeTreeMap;
    this.stepInto_ = false;
    this.stepOver_ = false;
    this.start_ = false;
    this.slowRun = false;
    this.finish_ = false;
    this.pause_ = true;
    this.breakPoints = me.breakPoints;
    this.frp_ = me.frp_;
    this.watcher_ = me.watcher;
    this.watchingList = me.watchingList;
    this.initialiseDebugger();
};


/**
 *Initialise the debugger.
 */
recoil.debugger.ui.Debugger.prototype.initialiseDebugger = function() {
    this.widget_.resetNodesColor();

    this.frp_.setDebugger(this);
};

/**
 * this is called before each node is visited,
 * in order to stop return false,
 * @param {!recoil.frp.Behaviour} node
 * @return {boolean}
 * @suppress {deprecated}
 */

recoil.debugger.ui.Debugger.prototype.preVisit = function(node) {
    var fill = new goog.graphics.SolidFill('rgba(113, 191, 68, 1)');
    var me = this;
    me.widget_.setCurrentNode(node, fill);
    me.widget_.currentNode = node;
    if (me.finish_) {
      return true;
    }
    if (me.breakPoints[node.origSeq_]) {
        me.setPaused(true);
        return false;
    }
    if (me.stepInto_) {
        me.setPaused(true);
        me.stepInto_ = false;
        return false;
    }
    if (me.stepOver_ && me.isVisible(node)) {
        me.setPaused(true);
        me.stepOver_ = false;
        me.pause_ = true;
        return false;
    }
    if (me.pause_) {
        me.setPaused(true);
        return false;
    }
    if (me.start_) {
      setTimeout(function() {
        me.frp_.tm().resume();
      },10);
      return false;
    }
    if (!me.pause_ && !me.stepOver_ && !me.stepInto_) {
        setTimeout(function() {
            me.frp_.tm().resume();
        },1000);
        return false;
    }
    return true;
};

/**
 * called after the node has been visited
 * @param {!recoil.frp.Behaviour} node
 * @suppress {deprecated}
 */

recoil.debugger.ui.Debugger.prototype.postVisit = function(node) {
    var postFill = new goog.graphics.SolidFill('rgba(215, 223, 33, 1)');
    this.setPaused(false);
    this.widget_.setCurrentNode(node, postFill);
};
/**
 *Paused the debugger tracing.
 * @param {boolean} paused
 */
recoil.debugger.ui.Debugger.prototype.setPaused = function(paused) {
    this.widget_.setPaused(paused);

    if (paused) {
        this.widget_.pendingUp = this.frp_.tm().getPendingUp();
        this.widget_.pendingDown = this.frp_.tm().getPendingDown();
        this.watcher_.setState(this.widget_.currentNode, this.widget_.selectNode, this.widget_.watchingList,
        this.widget_.pendingUp, this.widget_.pendingDown);
    }
};


/**
*Find out this behaviour node is visible or not
* @param {recoil.frp.Behaviour} nodeB
* @return {recoil.frp.Behaviour}
*/
recoil.debugger.ui.Debugger.prototype.isVisible = function(nodeB) {
    return this.nodeTreeMap_[nodeB.origSeq_];
};


/**
 *Save the watcher information into localStorage
 */
recoil.debugger.ui.prototype.saveWatcherInfo = function() {
    var watcherInfo = {};
    watcherInfo.selectNodeSeq = this.selectNode.origSeq_;
    watcherInfo.watchingList = [];
    this.watchingList.forEach(function(node) {
      watcherInfo.watchingList.push(node.origSeq_);
    });
    this.window_.localStorage.setItem('debugger.watcherInfo', JSON.stringify(watcherInfo));

};


/**
 *Save the drawn nodes information into localStorage
 */
recoil.debugger.ui.prototype.saveNodeInfo = function() {
    var openNodes = [];

    var me = this;
    var nodes = Object.values(me.nodeTreeMap);
    nodes.forEach(function(node) {
      var openNode = {};
      openNode.seq_ = node.seq_;
      openNode.x = node.x;
      openNode.y = node.y;
      openNode.avgHeight = node.avgHeight;
      openNode.isBreakPoint = node.isBreakPoint;
      openNode.selected = node.selected;
      openNode.paths = {};
      openNode.fill = node.dot.fill;
      if (node.paths.providers) {
        // console.log('path dep Seq', Object.keys(node.paths.dependancies));
        openNode.paths.providers = Object.keys(node.paths.providers);
      }else {
        openNode.paths.providers = [];
      }
      openNodes.push(openNode);
    });

    this.window_.localStorage.setItem('debugger.openNodes', JSON.stringify(openNodes));
};


/**
 *Set the selected node as a breakPoint
 * @param {Object} node
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.setBreakPoint = function(node) {
    var strokeSelected = new goog.graphics.Stroke(2, 'grey');
    var stroke = new goog.graphics.Stroke(2, 'lightgrey');
    if (node.isBreakPoint) {
        // selected node is breakPoint already, remove it from the breakPoints list.
        node.dot.setStroke(stroke);
        delete this.breakPoints[node.seq_];
        node.isBreakPoint = false;
        this.debugger_.breakPoints = this.breakPoints;
    }else {
        // set selected node as break point and push it to the breakpoints
        node.dot.setStroke(strokeSelected);
        this.breakPoints[node.seq_] = node.seq_;
        node.isBreakPoint = true;
        if (this.debugger_) {
            this.debugger_.breakPoints = this.breakPoints;
        }
    }
};


/**
 * Change color of the current behavior node or draw a new behaivior node.
 * @param {recoil.frp.Behaviour} nodeB
 * @param {goog.graphics.SolidFill} fill
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.setCurrentNode = function(nodeB, fill) {
    var seq_ = nodeB.origSeq_;
    var node = this.nodeTreeMap[seq_];
    var nodeErrors = nodeB.unsafeMetaGet().errors();
    if (nodeErrors && nodeErrors.length > 0) {
        fill = new goog.graphics.SolidFill('red');
    }
    if (node) {
        // If the node is drawn, change the color of node
        node.dot.setFill(fill);
    }else if (node || (!this.debugger_.stepOver_ && !this.debugger_.finish_)) {
        // If the node is undrawn, find node dependancies and draw the node. then set the color.
        this.findDependencies(nodeB, 5);
        this.setCurrentNode(nodeB, fill);
    }
};


/**
 * Draw a node dot and text in the debugger map depends on the coordinates stored in node Object.
 * @param {Object} node
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawNode = function(node) {
    var fill = new goog.graphics.SolidFill('lightgrey');
    this.drawNodeCircle(this.mapSvg, node, fill, this.dragListener_);
    this.drawNodeText(this.mapSvg, node);
    this.nodeTreeMap[node.seq_] = node;
};


/**
 * Draw a root node dot and text in the debugger map. The root node is a node without providers.
 * @param {recoil.frp.Behaviour} nodeB
 */
recoil.debugger.ui.prototype.drawRootNode = function(nodeB) {
    var roots = this.rootNodes;
    var rootKeys = [];
    if (roots) {
        rootKeys = Object.keys(roots);
    }

    var me = this;
    var x = 100;
    var avgHeight = Math.max(50, this.height_ / (rootKeys.length + 1));
    var y = 200;

    var dependancies = this.dependancyMap[nodeB.origSeq_];
    var node = this.createNode(nodeB, nodeB.origSeq_, dependancies, x, y, avgHeight);
    this.drawNode(node);
};


/**
 * To draw the behavior node depends on coordinates of its dependancies drawn in the debugger map.
 * Search drawn dependancies node in the whole debugger map.
 * @param {recoil.frp.Behaviour} nodeB
 * @param {number} layers iteration times to search dependancy node.
 */
recoil.debugger.ui.prototype.findDependencies = function(nodeB, layers) {
    var me = this;
    var deps = this.dependancyMap[nodeB.origSeq_];
    var drawn = false;
    if (deps) {
        var i = 0;
        while (!drawn && i < deps.length) {
            var depNode = me.nodeTreeMap[deps[i].origSeq_];
            if (depNode) {
                // the depNode is drawn, draw the nodeB with this dependancy's coordinate.
                me.drawProvider(depNode, nodeB);
                drawn = true;
            }else {
                //If the depNode is undrawn and it is a rootNode, draw the rootNode.
                var depsOfdeps = this.dependancyMap[deps[i].origSeq_];
                if (!depsOfdeps) {
                    me.drawRootNode(deps[i]);
                    me.drawProvider(me.nodeTreeMap[deps[i].origSeq_], nodeB);
                    drawn = true;
                }
            }
            i++;
        }
        // All dependancies of the nodeB are undrawn.find the deeper layer dependancies
        if (!drawn && layers > 0) {
            deps.forEach(function(depB) {
                me.findDependencies(depB, layers);
                layers--;
            });
        }
    }else {
        // nodeB doesn't have dependancies. It's a root node.
        me.drawRootNode(nodeB);
        var providers = nodeB.providers_;
        providers.forEach(function(providerB) {
            me.drawProvider(me.nodeTreeMap[nodeB.origSeq_], providerB);
        });
    }
};


/**
 *Find root nodes in the whole map. The root nodes should be a behaivior
 *which doesn't have any dependancy.
 */
recoil.debugger.ui.prototype.getRootNodes = function() {
    var dependancyMap = this.frp_.tm().dependancyMap_;
    var keys = Object.keys(dependancyMap);
    var roots = {};
    var behaviors = {};
    keys.forEach(function(key) {
        var dependancies = dependancyMap[key];

        dependancies.forEach(function(dependancy) {
            var deps = dependancyMap[dependancy.origSeq_];
            if (!deps) {
                behaviors[dependancy.origSeq_] = dependancy;
            }

            var providers = dependancy.providers_;
            providers.forEach(function(provider) {
                behaviors[provider.origSeq_] = provider;
            });
        });
    });
    this.behaviors = behaviors;

    Object.values(behaviors).forEach(function(behavior) {
        var deps = dependancyMap[behavior.origSeq_];
        if (!deps) {
            roots[behavior.origSeq_] = behavior;
        }
    });
    this.rootNodes = roots;
};


/**
 *Draw open nodes in the node map.
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawOpenNodes = function() {
  var me = this;
  var stroke = new goog.graphics.Stroke(1, 'grey');

    // draw node
    this.openNodes.forEach(function(openNode) {
      var behavior = me.behaviors[openNode.seq_];
      var dependancy = me.dependancyMap[openNode.seq_];
      if (behavior) {
          var node = me.createNode(behavior, openNode.seq_, dependancy,
              openNode.x, openNode.y, openNode.avgHeight);
              if (openNode.fill) {
                  var fill = new goog.graphics.SolidFill(openNode.fill.color_);
              }
              node.isBreakPoint = openNode.isBreakPoint;
              node.select = openNode.selected;
              me.drawNode(node);
              if (node.isBreakPoint) {
                  node.isBreakPoint = false;
                  me.setBreakPoint(node);
              }
      }
  });

    // draw path
    this.openNodes.forEach(function(openNode) {
      var node = me.nodeTreeMap[openNode.seq_];
      var proNodeSeq = openNode.paths.providers;
      if (proNodeSeq.length > 0 && node) {
          proNodeSeq.forEach(function(seq) {
              var proNode = me.nodeTreeMap[seq];
              if (proNode) {
                  me.drawNodePath(me.mapSvg, node, me.nodeTreeMap[seq], stroke);
              }
          });
        }
    });
};


/**
 *Draw the node map beginning with root nodes or open nodes.
 */
recoil.debugger.ui.prototype.drawNodeTree = function() {
    var me = this;
    if (this.openNodes && this.openNodes.length > 0) {
        this.drawOpenNodes();
    }else {
      var roots = this.selectedRootNodes;
      if (roots) {
          var rootKeys = Object.keys(roots);
          rootKeys.forEach(function(key) {
              me.drawRootNode(roots[key]);
          });
      }
    }
};


/**
 *Reset all nodes' color to ligthgrey and path color to grey.
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.resetNodesColor = function() {
    var nodes = Object.values(this.nodeTreeMap);
    var me = this;
    var pathStroke = new goog.graphics.Stroke(1, 'grey');
    nodes.forEach(function(node) {
        node.dot.setFill(me.fill);
        Object.values(node.paths.providers).forEach(function(path) {
            path.setStroke(pathStroke);
        });
        Object.values(node.paths.dependancies).forEach(function(path) {
            path.setStroke(pathStroke);
        });
    });
};


/**
 *Draw a main graph area in the debugger map SVG.
 * @param {goog.graphics.SvgGraphics} svg
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawMainG = function(svg) {
    var me = this;
    var stroke = new goog.graphics.Stroke(1, 'lightgrey');
    this.mainGraphic = svg.drawRect(0, 0, this.width_, this.height_, stroke, new goog.graphics.SolidFill('rgba(0,0,0,0)', this.mapViewG_),
        this.mapViewG_);

    goog.events.listen(me.mainGraphic, 'mousedown', function(e) {
        me.dragListener_.startRect(me.mainGraphic, e);
    });

    goog.events.listen(me.mainGraphic, 'mouseup', function(e) {
        me.dragListener_.done(e);
    });

    goog.events.listen(me.mainGraphic, 'mouseout', function(e) {
        me.dragListener_.doneRect(e);
    });

    goog.events.listen(me.mainGraphic, 'mousemove', function(e) {
        me.dragListener_.move(e);
    });
};


/**
 *DragListener constructor.
 * @param {recoil.debugger.ui} me
 * @this {recoil.debugger.ui.DragListener}
 * @constructor
 */
recoil.debugger.ui.DragListener = function(me) {
    this.map_ = me;
    // this.nodeMap_ = me.nodeMap;
    this.dragging_ = false;
    this.draggingRect_ = false;
    this.moved_ = false;
    this.map_.mapViewSvg = document.getElementById('mapViewSvg');
};


/**
 *Drag event of a circle(dot) is done.
 * @param {Object} e event
 */
recoil.debugger.ui.DragListener.prototype.done = function(e) {

    if (this.draggingRect_) {
        this.map_.xOffset += (this.startX - e.offsetX);
        this.map_.yOffset += (this.startY - e.offsetY);
    }
    this.dragging_ = false;
    this.draggingRect_ = false;
    this.moved_ = true;
};


/**
 *Drag event of a rectradian is done.
 * @param {Object} e event
 */
recoil.debugger.ui.DragListener.prototype.doneRect = function(e) {

    if (this.draggingRect_) {
        this.map_.xOffset += (this.startX - e.offsetX);
        this.map_.yOffset += (this.startY - e.offsetY);
    }

    this.draggingRect_ = false;
    this.moved_ = true;
};


/**
 *Dragging a circle or a rectradian.
 * @param {Object} e event
 */
recoil.debugger.ui.DragListener.prototype.move = function(e) {

    if (this.draggingRect_) {
        if (!this.map_.mapViewSvg) {
            this.map_.mapViewSvg = document.getElementById('mapViewSvg');
        }

        var transX = (this.startX - e.offsetX);
        var transY = (this.startY - e.offsetY);
        this.map_.mapViewSvg.setAttributeNS(null, 'viewBox', (this.map_.xOffset + transX) + ',' + (this.map_.yOffset + transY)
            + ',' + this.map_.width_ * this.map_.scaleNum + ',' + this.map_.height_ * this.map_.scaleNum);
    }


    if (this.dragging_) {
        this.node_.x = e.offsetX * this.map_.scaleNum + this.map_.xOffset;
        this.node_.y = e.offsetY * this.map_.scaleNum + this.map_.yOffset;
        this.moved_ = true;

        //reset circle
        this.el_.setCenter(e.offsetX * this.map_.scaleNum + this.map_.xOffset,
            e.offsetY * this.map_.scaleNum + this.map_.yOffset);

        //reset text
        this.node_.text.setTransformation(e.offsetX * this.map_.scaleNum + this.map_.xOffset,
            e.offsetY * this.map_.scaleNum + this.map_.yOffset, 0, 0, 0);

        //reset Path
        var newPath;
        var me = this;
        Object.values(me.node_.paths.providers).forEach(function(path) {
            var radian = me.map_.calculateRadian(path.source, path.target);
            var coords = me.map_.calculateCoordinates(10, radian);
            newPath = goog.graphics.paths.createArrow(
                new goog.math.Coordinate(path.target.x - coords.x, path.target.y - coords.y),
                new goog.math.Coordinate(me.node_.x + coords.x, me.node_.y + coords.y), 0, 7);
            path.setPath(newPath);
            path.source.x = me.node_.x;
            path.source.y = me.node_.y;

            newPath.clear();
        });
        Object.values(me.node_.paths.dependancies).forEach(function(path) {
            var radian = me.map_.calculateRadian(path.source, path.target);
            var coords = me.map_.calculateCoordinates(10, radian);
            newPath = goog.graphics.paths.createArrow(
                new goog.math.Coordinate(me.node_.x - coords.x, me.node_.y - coords.y),
                new goog.math.Coordinate(path.source.x + coords.x, path.source.y + coords.y), 0, 7);
            path.setPath(newPath);
            path.target.x = me.node_.x;
            path.target.y = me.node_.y;
            newPath.clear();
        });
    }
};


/**
 *Drag event of a circle(dot) is started.
 * @param {goog.graphics.EllipseElement} el
 * @param {Object} node
 * @param {Object} e event
 */
recoil.debugger.ui.DragListener.prototype.start = function(el, node, e) {
    this.dragging_ = true;
    this.moved_ = false;
    this.node_ = node;
    this.el_ = el;
    if (!this.map_.mapViewSvg) {
        this.map_.mapViewSvg = document.getElementById('mapViewSvg');
    }
    this.map_.mapViewSvg.setAttributeNS(null, 'oncontextmenu', 'return false;');
};


/**
 *Drag event of the rectradian is started.
 * @param {Element} el
 * @param {Object} e event
 */
recoil.debugger.ui.DragListener.prototype.startRect = function(el, e) {
    this.draggingRect_ = true;
    this.moved_ = false;
    this.rect_ = el;
    if (!this.map_.mapViewSvg) {
        this.map_.mapViewSvg = document.getElementById('mapViewSvg');
    }
    this.map_.mapViewSvg.setAttributeNS(null, 'viewBox', this.map_.xOffset + ',' + this.map_.yOffset
        + ',' + this.map_.width_ * this.map_.scaleNum + ',' + this.map_.height_ * this.map_.scaleNum);

    this.startX = e.offsetX;
    this.startY = e.offsetY;
};


/**
 *Generate a pop up menu for clicked node.
 * @param {Object} e event
 * @param {goog.graphics.EllipseElement} element
 * @param {Object} node
 * @suppress {accessControls}
 */
recoil.debugger.ui.prototype.popUpMenu = function(e, element, node) {
    if (this.pm) {
        this.pm.exitDocument();
        this.debuggerDiv.removeChild(this.pm.getElement());
    }
    if (this.depsMenu) {
        this.depsMenu.exitDocument();
    }
    var me = this;
    this.pm = new goog.ui.PopupMenu();
    this.pm.setId('popUpMenu');
    var prosMenu = new goog.ui.SubMenu('Expand providers');
    this.depsMenu = new goog.ui.SubMenu('Expand dependancies');
    var hideNode = new goog.ui.MenuItem('Hide Node');
    var addWatch = new goog.ui.MenuItem('Add to Watches');
    var removeWatch = new goog.ui.MenuItem('Remove from Watches');
    var setBreak = new goog.ui.MenuItem('Set breakpoint');
    var removeBreak = new goog.ui.MenuItem('Remove breakpoint');
    var showAllDeps = new goog.ui.MenuItem('Expand all dependancies');
    var showAllPros = new goog.ui.MenuItem('Expand all providers');

    this.pm.addChild(prosMenu, true);
    prosMenu.addItem(showAllPros);
    if (node.behavior.providers_.length > 0) {
        node.behavior.providers_.forEach(function(proNode) {
            if (!proNode.name_) {
                proNode.name_ = 'unknown';
            }
            var proItem = new goog.ui.MenuItem(proNode.name_);
            proItem.setValue(proNode.origSeq_);
            prosMenu.addItem(proItem);
            goog.events.listen(proItem, 'action', function(e) {
                me.drawProvider(node, proNode);
            });
        });
    }else {
        prosMenu.setEnabled(false);
    }

    this.pm.addChild(this.depsMenu, true);
    this.pm.addChild(hideNode, true);

    if (me.inWatchingList(node.seq_)) {
        this.pm.addChild(removeWatch, true);
    }else {
        this.pm.addChild(addWatch, true);
    }

    if (node.isBreakPoint) {
        this.pm.addChild(removeBreak, true);
    }else {
        this.pm.addChild(setBreak, true);
    }

    this.depsMenu.addItem(showAllDeps);
    if (node.dependancy) {
        node.dependancy.forEach(function(depNode) {
            var depItem = new goog.ui.MenuItem(depNode.name_);
            depItem.setValue(depNode.origSeq_);
            me.depsMenu.addItem(depItem);
            goog.events.listen(depItem, 'action', function(e) {
                me.drawDependancy(node, depNode);
            });
        });
    }else {
        this.depsMenu.setEnabled(false);
    }

    goog.events.listen(this.pm, 'action', function(e) {
        if (e.target === showAllDeps) {
          me.drawDependancies(node);
      }else if (e.target === showAllPros) {
          me.drawProviders(node);
        }else if (e.target === hideNode) {
          me.hideProviders(node);
          me.hideNode(node);
        }else if (e.target === addWatch) {
          me.addWatch(node);
        }else if (e.target === removeWatch) {
          me.removeWatch(node.behavior);
        }else if (e.target === setBreak || e.target === removeBreak) {
          me.setBreakPoint(node);
        }
    });
    function offset(el) {
        var rect = el.getBoundingClientRect();
        var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
    }
    var divEl = me.debuggerDiv;
    this.pm.render(divEl);
    var pos = offset(divEl);
    this.pm.showMenu(me.mapDiv, e.clientX + 10 - pos.left, e.clientY + 10 - pos.top);

};


/**
 *resize SVG in the debugger map
 * @param {number} x
 * @param {number} y
 */
recoil.debugger.ui.prototype.resizeMap = function(x, y) {
    var me = this;
    if (x > this.width_) {
        this.width_ = x + 500;
        this.mapSvg.setSize(x + 500, me.height_);
        this.mainGraphic.setSize(x + 500, me.height_);
    }
    if (y > this.height_) {
        this.height_ = y + 500;
        this.mapSvg.setSize(me.width_, y + 500);
        this.mainGraphic.setSize(me.width_, y + 500);
    }
    if (!me.mapViewSvg) {
        me.mapViewSvg = document.getElementById('mapViewSvg');
    }
    if (me.mapViewSvg) {
        me.mapViewSvg.setAttributeNS(null, 'viewBox', me.xOffset + ',' + me.yOffset + ','
        + me.width_ * me.scaleNum + ',' + me.height_ * me.scaleNum);
    }
};


/**
 *Change the color of selected node.
 * @param {Object} node
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.changeNodeColor = function(node) {
    var selectedFill = new goog.graphics.SolidFill('#e0f7ff');
    var fill = this.previousFill;
    if (this.previousNode) {
        this.previousNode.dot.setFill(fill);
    }
    this.previousFill = node.dot.getFill();
    this.previousNode = node;
    node.dot.setFill(selectedFill);
};


/**
 *Draw the node dot in the SVG graph.
 * @param {goog.graphics.SvgGraphics} svg
 * @param {Object} node
 * @param {goog.graphics.SolidFill} fill
 * @param {recoil.debugger.ui.DragListener} dragListener
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawNodeCircle = function(svg, node, fill, dragListener) {
    var me = this;
    var stroke = new goog.graphics.Stroke(2, 'lightgrey');
    if (node.y > me.height_ || node.x > me.width_) {
        me.resizeMap(node.x, node.y);
    }
    var ellipseElem = svg.drawEllipse(node.x, node.y, 10, 10, stroke, fill, this.mapViewG_);
    node.dot = ellipseElem;

    var isDrag;
    goog.events.listen(ellipseElem, 'mouseup', function(e) {
        dragListener.done(e);
        if (!isDrag) {
            console.log('Source Calculator Function: \n', node.behavior.srcCalc_);
            console.log('Source Inverse Function: \n', node.behavior.srcInv_);
            me.selectNode = node.behavior;
            me.watcher.setState(me.currentNode, me.selectNode, me.watchingList,
                me.pendingUp, me.pendingDown);
                me.changeNodeColor(node);
        }
    });

    goog.events.listen(ellipseElem, 'mousedown', function(e) {
        isDrag = false;
        if (e.button === 0) {
          dragListener.start(ellipseElem, node, e);
        }
    });

    goog.events.listen(ellipseElem, 'mousemove', function(e) {
        isDrag = true;
        dragListener.move(e);
    });

    goog.events.listen(ellipseElem, 'contextmenu', function(e) {
        isDrag = true;
        me.popUpMenu(e, ellipseElem, node);
    });

    goog.events.listen(ellipseElem, 'dblclick', function(e) {
        me.setBreakPoint(node);
    });
};


/**
 *Draw a text of the node in the SVG graph.
 * @param {goog.graphics.SvgGraphics} svg
 * @param {Object} node
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawNodeText = function(svg, node) {
    var font = new goog.graphics.Font(12, 'Arial');
    var font_color = new goog.graphics.SolidFill('grey');
    var me = this;
    var text = svg.drawTextOnLine(node.behavior.name_ + ' ' + node.seq_, 15, 0, 45, 0, 'left', font, null, font_color, this.mapViewG_);
    text.setTransformation(node.x, node.y, 0, 0, 0);
    node.text = text;

    var texts = text.getElement();
    goog.dom.setProperties(texts, {
        'style': '-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;',
        'id': 'text' + node.seq_
    });
};


/**
 *Draw a Path in the SVG graph.
 * @param {goog.graphics.SvgGraphics} svg
 * @param {Object} rootNode dependancy node
 * @param {Object} node provider node
 * @param {goog.graphics.Stroke} stroke
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawNodePath = function(svg, rootNode, node, stroke) {
    var radian = this.calculateRadian(rootNode, node);
    var coords = this.calculateCoordinates(10, radian);
    var nodePath = goog.graphics.paths.createArrow(
            new goog.math.Coordinate(node.x - coords.x, node.y - coords.y),
            new goog.math.Coordinate(rootNode.x + coords.x, rootNode.y + coords.y), 0, 7);
    var fill = new goog.graphics.SolidFill('grey');
    var path = svg.drawPath(nodePath, stroke, fill, this.mapViewG_);

    var source = {'x': rootNode.x, 'y': rootNode.y};
    var target = {'x': node.x, 'y': node.y};
    path['source'] = source;
    path['target'] = target;

    path.getElement().style.pointerEvents = 'none';
    node.paths.dependancies[rootNode.seq_] = path;
    rootNode.paths.providers[node.seq_] = path;
};


/**
 *Calculate the path source and target coordinate.
 * @param {number} r radius
 * @param {number} radian
 * @return {Object} coords
 */
recoil.debugger.ui.prototype.calculateCoordinates = function(r, radian) {
    var coords = {};
    coords.x = r * Math.cos(radian);
    coords.y = r * Math.sin(radian);
    return coords;
};

/**
 *Radian of two nodes.
 * @param {Object} rootNode
 * @param {Object} node
 * @return {number} radian
 */
recoil.debugger.ui.prototype.calculateRadian = function(rootNode, node) {
    return Math.atan2(node.y - rootNode.y, node.x - rootNode.x);
};

/**
 *Whether the node in the  Watching list or not.
 * @param {Object} nodeSeq
 * @return {boolean} existed
 */
recoil.debugger.ui.prototype.inWatchingList = function(nodeSeq) {
    var existed = false;
    this.watchingList.forEach(function(item) {
        if (item.origSeq_ === nodeSeq) {
            existed = true;
        }
    });
    return existed;
};


/**
 *add the node into Watching list.
 * @param {Object} node
 */
recoil.debugger.ui.prototype.addWatch = function(node) {
    var existed = this.inWatchingList(node.seq_);
    if (!existed) {
      this.watchingList.push(node.behavior);
      this.watcher.setState(this.currentNode, this.selectNode, this.watchingList,
        this.pendingUp, this.pendingDown);
    }
};


/**
 *Remove the node from Watch list.
 * @param {recoil.frp.Behaviour} nodeB
 */
recoil.debugger.ui.prototype.removeWatch = function(nodeB) {
    this.watchingList = this.watchingList.filter(function(item) {
      return item !== nodeB;
    });
    this.watcher.setState(this.currentNode, this.selectNode, this.watchingList,
      this.pendingUp, this.pendingDown);

};


/**
 *hide all providers of the rootNote
 * @param {Object} rootNode
 */
recoil.debugger.ui.prototype.hideProviders = function(rootNode) {
    var providerKeys = Object.keys(rootNode.paths.providers);
    var paths = rootNode.paths.providers;
    var me = this;
    //remove providers node and text
    providerKeys.forEach(function(key) {
        var node = me.nodeTreeMap[key];
        if (node) {
            paths[key].getElement().remove();
            delete paths[key];
            if (node.selected.length > 1) {
                //selected by multiple providers, don't remove the node
                node.selected = node.selected.filter(function(t) { return t !== rootNode.seq_; });
            }else {
                node.selected = [];
                node.dot.getElement().remove();
                node.text.getElement().remove();
                me.hideProviders(node);
                me.hideProviderPath(node);
                delete me.nodeTreeMap[key];

            }
        }

    });

};


/**
 *hide all providerPaths of the rootNode.
 * @param {Object} rootNode
 */
recoil.debugger.ui.prototype.hideProviderPath = function(rootNode) {
    var providerKeys = Object.keys(rootNode.paths.providers);
    var depKeys = Object.keys(rootNode.paths.dependancies);
    var paths = rootNode.paths.dependancies;
    var me = this;
    // remove dependancies paths;
    depKeys.forEach(function(key) {
        paths[key].getElement().remove();
        delete paths[key];
    });
};


/**
 *hide the node.
 * @param {Object} rootNode
 */
recoil.debugger.ui.prototype.hideNode = function(rootNode) {
    var dependancyKeys = Object.keys(rootNode.paths.dependancies);
    var me = this;
    dependancyKeys.forEach(function(key) {
        var depNode = me.nodeTreeMap[key];
        if (depNode) {
            var paths = depNode.paths.providers;
            paths[rootNode.seq_].getElement().remove();
            delete paths[rootNode.seq_];
        }
    });
    rootNode.selected = [];
    rootNode.dot.getElement().remove();
    rootNode.text.getElement().remove();
    delete me.nodeTreeMap[rootNode.seq_];
};


/**
 *show all dependancies of the rootNode.
 * @param {Object} rootNode
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawDependancies = function(rootNode) {
    var deps = this.dependancyMap[rootNode.seq_];
    var me = this;
    var fill = new goog.graphics.SolidFill('rgba(88, 157, 231, 1)');
    var stroke = new goog.graphics.Stroke(1, 'rgba(88, 157, 231, 1)');
    deps.forEach(function(depB) {
        var depPaths = rootNode.paths.dependancies;
        var seq_ = depB.origSeq_;
        var depNode = me.nodeTreeMap[seq_];
        if (depNode) {
            // depNode is drawn
            depNode.dot.setFill(fill);
            Object.values(depPaths).forEach(function(path) {
                path.setStroke(stroke);
            });
        }else {
            // depNode is undrawn
            me.drawDependancy(rootNode, depB);
        }
        if (!depPaths[seq_]) {
            me.drawNodePath(me.mapSvg, depNode, rootNode, stroke);
        }
    });
};


/**
 *draw s dependancy of the rootNote
 * @param {Object} rootNode
 * @param {recoil.frp.Behaviour} dependancy
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawDependancy = function(rootNode, dependancy) {
    var me = this;
    var fill = new goog.graphics.SolidFill('rgba(88, 157, 231, 1)');
    var stroke = new goog.graphics.Stroke(1, 'rgba(88, 157, 231, 1)');
    var dependancies = rootNode.dependancy;
    var depNum = dependancies.length;
    var avgWidth = Math.min(150, this.width_ / 10);
    var avgHeight = Math.min(50, this.height_ / depNum);
    var x = rootNode.x - avgWidth;
    var y = rootNode.y - Math.floor(depNum / 2) * avgHeight;

    var seq_ = dependancy.origSeq_;
    var node = me.nodeTreeMap[seq_];
    if (node) {
        //the node is existed, only draw the path and set the node color
        var dependancyPath = rootNode.paths.dependancies;
        if (dependancyPath[seq_]) {
            dependancyPath[seq_].setStroke(stroke);
        }else {
            me.drawNodePath(me.mapSvg, node, rootNode, stroke);
            rootNode.selected.push(node.seq_);
        }
        node.dot.setFill(fill);
    }else {
        //create the node and draw the path
        var dependancyArray = me.dependancyMap[dependancy.origSeq_];
        if (dependancyArray === undefined) dependancyArray = [];
        node = me.createNode(dependancy, dependancy.origSeq_,
            dependancyArray, x, y, avgHeight);
        rootNode.selected.push(node.seq_);

        me.drawNode(node);
        me.drawNodePath(me.mapSvg, node, rootNode, stroke);
    }
};


/**
 *draws provider of the rootNote
 * @param {Object} rootNode
 * @param {recoil.frp.Behaviour} providerB
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawProvider = function(rootNode, providerB) {
    var me = this;
    var fill = new goog.graphics.SolidFill('lightgrey');
    var stroke = new goog.graphics.Stroke(1, 'grey');
    var providers = rootNode.behavior.providers_;
    var providersNum = providers.length;

    var avgWidth = Math.min(150, this.width_ / 10);
    var avgHeight = Math.min(50, this.height_ / providersNum);
    var x = rootNode.x + avgWidth;
    var y;
    if (providersNum === 1) {
        y = rootNode.y;
    }else {
        y = rootNode.y - Math.floor(providersNum / 2 - 1) * avgHeight;
    }
    var seq_ = providerB.origSeq_;
    var providerNode = me.nodeTreeMap[seq_];
    var deps = this.dependancyMap[seq_];
    if (providerNode) {
        //the node is existed, only draw the path and set the node color
        var providerPath = rootNode.paths.providers;
        if (providerPath[seq_]) {
            providerPath[seq_].setStroke(stroke);
        }else {
            me.drawNodePath(me.mapSvg, rootNode, providerNode, stroke);
            providerNode.selected.push(rootNode.seq_);
        }
    }else {
        //create the node and draw the path
        providerNode = me.createNode(providerB, providerB.origSeq_,
            deps, x, y, avgHeight);
        providerNode.selected.push(rootNode.seq_);

        me.drawNode(providerNode);
        me.drawNodePath(me.mapSvg, rootNode, providerNode, stroke);
        me.drawProviderPath(providerNode);
        me.drawDepPath(providerNode);
    }
};


/**
 *draw the path from existed providers' node to rootNode
 * @param {Object} rootNode
 */
recoil.debugger.ui.prototype.drawProviderPath = function(rootNode) {
    var proNodes = rootNode.behavior.providers_;
    var me = this;
    proNodes.forEach(function(nodeB) {
        var seq = nodeB.origSeq_;
        if (me.nodeTreeMap[seq]) {
            me.drawProvider(rootNode, nodeB);
        }
    });
};

/**
 *draw dependancies' path of the rootNote
 * @param {Object} rootNode
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawDepPath = function(rootNode) {
    var me = this;
    var depNodes = rootNode.dependancy;
    var stroke = new goog.graphics.Stroke(1, 'grey');
    if (depNodes) {
        depNodes.forEach(function(nodeB) {
            var seq = nodeB.origSeq_;
            var depNode = me.nodeTreeMap[seq];
            var depPath = rootNode.paths.dependancies[seq];
            if (depNode && !depPath) {
                me.drawNodePath(me.mapSvg, depNode, rootNode, stroke);
                rootNode.selected.push(depNode.seq_);
            }
        });
    }
};


/**
 *draw all the providers of the rootNote
 * @param {Object} rootNode
 * @suppress {deprecated}
 */
recoil.debugger.ui.prototype.drawProviders = function(rootNode) {
    var providers = rootNode.behavior.providers_;
    var me = this;
    if (providers.length > 0) {
        providers.forEach(function(providerB) {
            me.drawProvider(rootNode, providerB);
        });
    }else {
        rootNode.dot.setFill(new goog.graphics.SolidFill('lightgrey'));
    }
};


/**
 *Create a node object contained node position, paths and so on.
 * @param {recoil.frp.Behaviour} behavior
 * @param {string} seq_
 * @param {Array<recoil.frp.Behaviour>} dependancy
 * @param {number} x
 * @param {number} y
 * @param {number} avgHeight
 * @return {Object} node
 */
// recoil.debugger.ui.prototype.createNode = function(behavior, seq_, dependancy, x, y, avgHeight) {
recoil.debugger.ui.prototype.createNode = function(behavior, seq_, dependancy, x, y, avgHeight) {
    var me = this;
    if (dependancy) {
        dependancy.forEach(function(depB) {
            var depNode = me.nodeTreeMap[depB.origSeq_];
            if (depNode && x <= depNode.x) {
                x = depNode.x + 150;
            }
        });
    }
    var node = {};
    node.seq_ = seq_;
    node.dependancy = dependancy;
    node.behavior = behavior;
    node.selected = [];
    node.isBreakPoint = false;
    node.x = x;
    node.y = y;
    node.paths = {'providers': {},
    'dependancies': {}};
    this.collision(node, avgHeight);
    return node;
};


/**
 *make sure the node doesn't have collision with previous nodes.
 * @param {Object} node
 * @param {number} avgHeight
 */
recoil.debugger.ui.prototype.collision = function(node, avgHeight) {
    var nodes = Object.values(this.nodeTreeMap);
    var me = this;
    nodes.forEach(function(el) {
        if (Math.abs(el.x - node.x) < 20 && Math.abs(el.y - node.y) < 20) {
            node.y += avgHeight;
            me.collision(node, avgHeight);
        }
    });
};
