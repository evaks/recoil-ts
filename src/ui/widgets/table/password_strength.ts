goog.provide('recoil.ui.widgets.table.PasswordStrengthColumn');

goog.require('recoil.ui.widgets.PasswordStrengthWidget');
goog.require('recoil.ui.widgets.table.makeStructColumn');


/**
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 * @param {!recoil.structs.table.ColumnKey} key
 * @param {!recoil.ui.message.Message|string} name
 * @param {Object=} opt_meta
 */
recoil.ui.widgets.table.PasswordStrengthColumn = recoil.ui.widgets.table.makeStructColumn(recoil.ui.widgets.PasswordStrengthWidget);
