/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 */
recoil.ui.widgets.MenuStructure = function(scope) {
      this.scope_ = scope;
      this.menuArr_ = [];
};

/**
 *
 * @param {Array<string>} menus
 * @param {recoil.ui.actions.ScreenAction} screenAction
 * @param {function () : !recoil.ui.Widget} opt_create
 */
recoil.ui.widgets.MenuStructure.prototype.add = function(menus, screenAction, opt_create) {

      var curMenus = this.menuArr_;
      for (var i = 0; i < menus.length; i++) {
            var idx = goog.array.findIndex(curMenus, function(el) {return el.name === menus[i];});


            var menuStruct;
            if (idx === -1) {
                  menuStruct = {
                        name: menus[i],
                        children: []
                  };
                  if (opt_create) {
                        menuStruct.create = opt_create;
                  }
                  curMenus.push(menuStruct);
            }
            else {
                  menuStruct = curMenus[idx];
            }
            if (i + 1 === menus.length) {
                  menuStruct.action = screenAction;

            }
            curMenus = menuStruct.children;
      }
};

/**
 * @param {!Array<string>} menus
 */
recoil.ui.widgets.MenuStructure.prototype.addSeparator = function(menus) {
      var menus1 = goog.array.clone(menus);
      menus1.push('');
      this.add(menus1, null, function() {
         return new recoil.ui.widgets.MenuSeparatorWidget();
      });
};
/**
 *
 * @param {recoil.ui.widgets.MenuButtonWidget} menu
 * @param {Object} item
 * @return {recoil.ui.widgets.MenuItemWidget}
 * @private
 */
recoil.ui.widgets.MenuStructure.prototype.create_ = function(menu, item) {
      if (item.children.length === 0) {
            if (item.create) {
                  return item.create();
            }
                  var menuItem = new recoil.ui.widgets.MenuItemActionWidget(this.scope_);
                  menuItem.attach(item.name, true, item.action.createCallback(this.scope_));

            return menuItem;
      } else {
            // submenu
            var subMenu = new recoil.ui.widgets.SubMenuWidget(this.scope_);

            var me = this;
            var subitems = [];
            item.children.forEach(function(it) {
                  var menuItem = me.create_(menu, it);
                  subMenu.getComponent().addItem(menuItem.getComponent());
                  subitems.push(me.create_(menu, it));
            });
            subMenu.attach(item.name, true);

            return subMenu;
      }
};

/**
 *
 * @return {recoil.frp.Behaviour<Array<recoil.ui.widgets.MenuButtonWidget>> | Array<recoil.ui.widgets.MenuButtonWidget>}
 */
recoil.ui.widgets.MenuStructure.prototype.create = function() {
      var menuArr = [];

      var me = this;
      for (var i = 0; i < this.menuArr_.length; i++) {
          if (this.menuArr_.hasOwnProperty(i)) {
              var menu = new recoil.ui.widgets.MenuButtonWidget(this.scope_);
              var items = [];

              goog.array.forEach(this.menuArr_[i].children, function(item) {
                  items.push(me.create_(menu, item));
              });
              menu.attach(this.menuArr_[i].name, items);
              menuArr.push(menu);
          }
      }
      return menuArr;
};
