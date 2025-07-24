
/**
 * provides paging functionality for table widget
 */
goog.provide('recoil.ui.widgets.table.PagedTableWidget');
goog.provide('recoil.ui.widgets.table.PagerWidget');
goog.provide('recoil.ui.widgets.table.createNextTablePager');

goog.require('goog.dom.classes');
goog.require('goog.string');
goog.require('goog.ui.Component');
goog.require('goog.ui.Container');
goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.Util');
goog.require('recoil.frp.table.TableCell');
goog.require('recoil.structs.table.Table');
goog.require('recoil.structs.table.TableRow');
goog.require('recoil.ui.AttachableWidget');
goog.require('recoil.ui.BoolWithExplanation');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.RenderedDecorator');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.messages');
goog.require('recoil.ui.widgets.LabelWidget');
goog.require('recoil.ui.widgets.TableMetaData');
goog.require('recoil.ui.widgets.table.Column');
goog.require('recoil.ui.widgets.table.StringColumn');
goog.require('recoil.ui.widgets.table.TableWidget');

/**
 * @constructor
 * @param {!recoil.ui.WidgetScope} scope
 * @param {boolean=} opt_new use new layout
 * @param {boolean=} opt_buttons do we want add/remove buttons default true
 * @implements recoil.ui.Widget
 */
recoil.ui.widgets.table.PagedTableWidget = function(scope, opt_new, opt_buttons) {
    let buttons = opt_buttons == undefined ? true : !!opt_buttons;
    this.scope_ = scope;
    this.container_ = new goog.ui.Component();
    this.container_.createDom();
    this.tableWidget_ = new recoil.ui.widgets.table.TableWidget(scope);
    this.headerWidget_ = new recoil.ui.widgets.table.TableWidget(scope);
//    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.container_, this, this.updateState_);

    this.topPager_ = new recoil.ui.widgets.table.PagerWidget(scope);
    this.bottomPager_ = new recoil.ui.widgets.table.PagerWidget(scope);

    var tableDiv = goog.dom.createDom('div');
    this.tableWidget_.getComponent().render(tableDiv);
    if (!opt_new) {
        goog.dom.classlist.add(tableDiv, 'flex-grow');
    }
    goog.dom.classlist.add(this.container_.getElement(), 'flex-display');

    var headerDiv = goog.dom.createDom('div', {class: 'recoil-table-pager-header'});
    if (!opt_new) {
        this.headerWidget_.getComponent().render(headerDiv);
    }
    var div = goog.dom.createDom('div', {class: 'recoil-table-pager-container'});

    this.container_.getElement().appendChild(div);
    if (opt_new) {
        if (buttons) {
            this.actionsDiv_ = goog.dom.createDom('div', {class: 'recoil-table-pager-actions'});
            this.addButton_ = new recoil.ui.widgets.ButtonWidget(scope);
            this.addButton_.getComponent().render(this.actionsDiv_);
            this.removeButton_ = new recoil.ui.widgets.ButtonWidget(scope);
            this.removeButton_.getComponent().render(this.actionsDiv_);
        }
        div.appendChild(goog.dom.createDom(
            'div', {class: 'recoil-table-pager-top'},
            goog.dom.createDom('div', {class: 'recoil-table-pager-top-scroller'},
                               this.topPager_.getComponent().getElement())));
        if (this.actionsDiv_) {
            div.appendChild(this.actionsDiv_);
        }

        div.appendChild(goog.dom.createDom('div', {class: 'recoil-table-pager-content'}, headerDiv, tableDiv));
    }
    else {
        div.appendChild(this.topPager_.getComponent().getElement());
        div.appendChild(headerDiv);
        div.appendChild(tableDiv);
    }
    div.appendChild(this.bottomPager_.getComponent().getElement());

    var me = this;
};


/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.table.PagedTableWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.table.PagedTableWidget.prototype.getComponent = function() {
    return this.container_;
};

/**
 *
 * @return {!recoil.ui.widgets.table.PagerWidget}
 */
recoil.ui.widgets.table.PagedTableWidget.prototype.getBottomPager = function() {
    return this.bottomPager_;
};

/**
 * @param {!recoil.frp.Behaviour|!Object} addB
 * @param {!recoil.frp.Behaviour|!Object} removeB
 */
recoil.ui.widgets.table.PagedTableWidget.prototype.attachAdd = function(addB, removeB) {
    this.addButton_.attachStruct(addB);
    this.removeButton_.attachStruct(removeB);
};



/**
 * the optional parameter is really meta, if not provide it is assumed that header and table include there meta data
 * this is the way is should be done however for backward compatablity I am leaving it the old way too
 *
 * @param {?recoil.frp.Behaviour<!recoil.structs.table.Table> | !recoil.structs.table.Table} header
 * @param {!recoil.frp.Behaviour<!recoil.structs.table.Table> | !recoil.structs.table.Table} table
 * @param {!recoil.frp.Behaviour<!recoil.ui.widgets.TableMetaData>|!recoil.ui.widgets.TableMetaData|recoil.frp.Behaviour<number>} metaOrPage
 * @param {!recoil.frp.Behaviour<number>|number} pageOrCount
 * @param {(!recoil.frp.Behaviour<number>|number)=} opt_count
 */
recoil.ui.widgets.table.PagedTableWidget.prototype.attach = function(header, table, metaOrPage, pageOrCount, opt_count) {
    if (this.actionsDiv_) {
        var util = new recoil.frp.Util(this.scope_.getFrp());
        var html = new recoil.ui.HtmlHelper(this.scope_);
        var editableB = this.scope_.getFrp().liftB(function(t) {
            var editable = t.getMeta().editable;
            return editable === undefined ? true : editable;
        }, util.toBehaviour(table));


        html.show(this.actionsDiv_, editableB);
    }
    if (opt_count === undefined) {
        if (header) {
            this.headerWidget_.attachStruct(header);
        }
        this.tableWidget_.attachStruct(table);
        this.topPager_.attach(/** @type {!recoil.frp.Behaviour<number>}*/(metaOrPage), pageOrCount);
        this.bottomPager_.attach(/** @type {!recoil.frp.Behaviour<number>}*/(metaOrPage), pageOrCount);
    }
    else {
        if (header) {
            this.headerWidget_.attach(
                header,
                /** @type {!recoil.frp.Behaviour<!recoil.ui.widgets.TableMetaData>|!recoil.ui.widgets.TableMetaData} */ (metaOrPage));
        }
        this.tableWidget_.attach(
            table, /** @type {!recoil.frp.Behaviour<!recoil.ui.widgets.TableMetaData>|!recoil.ui.widgets.TableMetaData} */(metaOrPage));
        this.topPager_.attach(/** @type {!recoil.frp.Behaviour<number>} */(pageOrCount), opt_count);
        this.bottomPager_.attach(/** @type {!recoil.frp.Behaviour<number>} */(pageOrCount), opt_count);
    }
};


/**
 * this should be called after the attach this way it can filter out the
 * rows that do not exist in the table.
 *
 * note this is a bidirectional behaviour, so setting it will change the selection
 *
 * @return {!recoil.frp.Behaviour<!Array<!Array<Object>>>}
 */
recoil.ui.widgets.table.PagedTableWidget.prototype.createSelected = function() {
    return this.tableWidget_.createSelected();
};


/**
 * @constructor
 * @param {!recoil.ui.WidgetScope} scope
 * @implements recoil.ui.Widget
 */
recoil.ui.widgets.table.PagerWidget = function(scope) {
    this.scope_ = scope;
    this.container_ = new goog.ui.Component();
    this.container_.createDom();
    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.container_, this, this.updateState_);
    var me = this;
    this.container_.getElement().className = 'recoil-table-pager-scroller';
    this.first_ = goog.dom.createDom('a', {
        class: 'first'},'\u00ab');
    this.last_ = goog.dom.createDom('a', {
        class: 'last'},'\u00bb');
    this.next_ = goog.dom.createDom('a', {
        class: 'next'},'\u203A');
    this.prev_ = goog.dom.createDom('a', {
        class: 'previous'},'\u2039');


    var selectPage = goog.dom.createDom('input', {
        type: 'text',
        class: 'page'
    });

    var container = goog.dom.createDom('table', {
        class: 'recoil-table-pager pagination'
    });

    this.pageInput_ = selectPage;

    goog.events.listen(this.pageInput_, goog.events.EventType.KEYDOWN, function(e) {
        if (e.keyCode === goog.events.KeyCodes.ENTER) {
            selectPage.blur();
        }
    });

    var row = goog.dom.createDom('div', {class: 'row'});

    selectPage.onblur = function() {
        me.scope_.getFrp().accessTrans(
            function() {
                if (me.helper_.isGood()) {
                    var val = parseInt(selectPage.value, 10);

                    if (val + '' === selectPage.value && val > 0 && val <= me.countB_.get()) {
                        me.pageB_.set(val);
                    }
                }
                me.updateInfo_();
            }, me.pageB_, me.countB_);

    };
    selectPage.onfocus = function() {
        me.scope_.getFrp().accessTrans(
            function() {
                if (me.helper_.isGood()) {
                    selectPage.value = me.pageB_.get();
                    selectPage.setSelectionRange(0, selectPage.value.length);
                }
            }, me.pageB_, me.countB_);
    };

    this.last_.onclick = function() {
        me.scope_.getFrp().accessTrans(
            function() {
                if (me.helper_.isGood()) {
                    me.pageB_.set(me.countB_.get());
                }
            }, me.pageB_, me.countB_);
    };

    this.first_.onclick = function() {
        me.scope_.getFrp().accessTrans(
            function() {
                if (me.helper_.isGood()) {
                    me.pageB_.set(1);
                }
            }, me.pageB_, me.countB_);
    };

    this.prev_.onclick = function() {
        me.scope_.getFrp().accessTrans(
            function() {
                if (me.helper_.isGood()) {
                    if (me.pageB_.get() > 1) {
                        me.pageB_.set(me.pageB_.get() - 1);
                    }
                }
            }, me.pageB_, me.countB_);
    };

    this.next_.onclick = function() {
        me.scope_.getFrp().accessTrans(
            function() {
                if (me.helper_.isGood()) {
                    if (me.pageB_.get() < me.countB_.get()) {
                        me.pageB_.set(me.pageB_.get() + 1);
                    }
                }
            }, me.pageB_, me.countB_);
    };

    container.appendChild(row);

    row.appendChild(this.first_);
    row.appendChild(this.prev_);
    row.appendChild(selectPage);
    row.appendChild(this.next_);
    row.appendChild(this.last_);

    this.container_.getElement().appendChild(container);
};


/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.table.PagerWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.table.PagerWidget.prototype.getComponent = function() {
    return this.container_;
};


/**
 * @param {!recoil.frp.Behaviour<number>} page the page that need to be displayed, must be behaviour otherwise
 8                                              we can't change the page
 * @param {!recoil.frp.Behaviour<number> |number} count
 */
recoil.ui.widgets.table.PagerWidget.prototype.attach = function(page, count) {
    var util = new recoil.frp.Util(this.scope_.getFrp());

    this.pageB_ = page;
    this.countB_ = util.toBehaviour(count);
    this.helper_.attach(page, this.countB_);
};

/***
 * helper to mark buttons disabled
 * @private
 * @param {boolean} disabled
 * @param {...Element} var_items
 */
recoil.ui.widgets.table.PagerWidget.prototype.disable_ = function(disabled, var_items) {

    for (var i = 1; i < arguments.length; i++) {
        var item = arguments[i];
        if (disabled) {
            goog.dom.classlist.add(item, 'disabled');
        }
        else {
            goog.dom.classlist.remove(item, 'disabled');
        }
    }
};

/**
 * updates the info in the table widget
 * @private
 */

recoil.ui.widgets.table.PagerWidget.prototype.updateInfo_ = function() {
    if (this.helper_.isGood()) {
        this.pageInput_.value = recoil.ui.messages.PAGE_X_OF_Y.resolve(
            { x: this.pageB_.get(), y: this.countB_.get() }).toString();
        var c = this.countB_.get();
        var p = this.pageB_.get();
        var enabled = c > 1;
        this.pageInput_.disabled = !enabled;
        this.disable_(!enabled || p === 1, this.first_, this.prev_);
        this.disable_(!enabled || p === c, this.last_, this.next_);
        this.pageInput_.disabled = !enabled;
    }
    else {
        this.pageInput_.disabled = true;
        this.disable_(true, this.first_, this.prev_, this.last_, this.next_);
        this.pageInput_.value = recoil.ui.messages.PAGE_X_OF_Y.resolve(
            { x: this.pageB_.metaGet().good() ? this.pageB_.get() : recoil.ui.messages.__UNKNOWN_VAL,
              y: this.countB_.metaGet().good() ? this.countB_.get() : recoil.ui.messages.__UNKNOWN_VAL}).toString();
    }
};

/**
 * updates the display in the pager widget
 * @private
 */
recoil.ui.widgets.table.PagerWidget.prototype.updateState_ = function() {
    var enabled = this.helper_.isGood();
    if (this.helper_.isGood()) {
        if (this.pageInput_ !== document.activeElement) {
            this.updateInfo_();
        }
    }
    else {
        this.updateInfo_();
    }

};

/**
 * a pager that takes a table with 2 extra rows
 * @param {!recoil.frp.Behaviour<!recoil.structs.table.Table>} tableB table to be paged, it should contain an extra row for before and after (if it exists)
 * @param {!recoil.frp.Behaviour<Object>} keyB an object specifies to do nextcan be null - first, page: _, prev: row, next: row
 * @param {!recoil.frp.Behaviour<number>|number} pageSize size of a page
 * @param {!recoil.frp.Behaviour<number>|number} tableSize size of the entire table
 * @return {{page:!recoil.frp.Behaviour<number>,table: !recoil.frp.Behaviour<!recoil.structs.table.Table>, count : !recoil.frp.Behaviour<number>}}
 */

recoil.ui.widgets.table.createNextTablePager = function(tableB, keyB, pageSize, tableSize) {
    var frp = tableB.frp();
    var util = new recoil.frp.Util(tableB.frp());
    var pageSizeB = util.toBehaviour(pageSize);
    var tableSizeB = util.toBehaviour(tableSize);
    var memoryB = frp.createB(1);
    var countB = frp.liftB(function(size, pageSize) {
            return Math.ceil(size / pageSize);
    }, tableSizeB, pageSizeB);

    var rememberPageB = tableB.frp().liftBI(
        function()  {
            if (countB.get() < memoryB.get()) {
                keyB.set({page: Math.max(1, countB.get())});
                memoryB.set(Math.max(1, countB.get()));
            }
            return {orig: memoryB.get(), val: memoryB.get()};
        },
        function(val) {
            // allow setting of value it table is not good, changing the page will probaly cause this
            if (!tableB.good()) {
                memoryB.set(val.val);
                return;
            }
            var table = tableB.get();
            var first = null;
            var last = null;

            table.forEach(function(row) {
                first = first || row;
                last = row;
            });

            if (val.orig + 1 === val.val) {
                // value has increased by 1 just get the next page
                if (last) {
                    keyB.set({next: last, page: val.val});
                    memoryB.set(val.val);
                }
            }
            else if (val.val === 1) {
                // we want the first page no need for a key
                keyB.set(null);
                memoryB.set(val.val);
            }
            else if (val.orig - 1 === val.val) {
                // went back 1 use prev
                keyB.set({prev: first, page: val.val});
                memoryB.set(val.val);
            }
            else {
                // random page just get that
                keyB.set({page: val.val});
                memoryB.set(val.val);
            }
        }, tableB, keyB, memoryB, pageSizeB, countB);


    var pageB = frp.liftBI(
        function(page) {
            return rememberPageB.get().val;
        },
        function(val) {
            if (rememberPageB.get() === null) {
                rememberPageB.set({orig: null, val: val});
            }
            else {
                rememberPageB.set({orig: rememberPageB.get().orig, val: val});
            }
        }, rememberPageB);
    return {
        table: tableB,
        page: pageB,
        count: countB
    };
};
