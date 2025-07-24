import {userAgent} from "./useragent";

export enum EventType {
    CLICK= 'click',
    RIGHTCLICK= 'rightclick',
    DBLCLICK= 'dblclick',
    MOUSEDOWN= 'mousedown',
    MOUSEUP= 'mouseup',
    MOUSEOVER= 'mouseover',
    MOUSEOUT= 'mouseout',
    MOUSEMOVE= 'mousemove',
    MOUSEENTER= 'mouseenter',
    MOUSELEAVE= 'mouseleave',
    // Select start is non-standard.
    // See http=//msdn.microsoft.com/en-us/library/ie/ms536969(v=vs.85).aspx.
    SELECTSTART= 'selectstart',  // IE, Safari, Chrome

    // Wheel events
    // http=//www.w3.org/TR/DOM-Level-3-Events/#events-wheelevents
    WHEEL= 'wheel',

    // Key events
    KEYPRESS= 'keypress',
    KEYDOWN= 'keydown',
    KEYUP= 'keyup',

    // Focus
    BLUR= 'blur',
    FOCUS= 'focus',
    DEACTIVATE= 'deactivate',  // IE only
    // NOTE= The following two events are not stable in cross-browser usage.
    //     WebKit and Opera implement DOMFocusIn/Out.
    //     IE implements focusin/out.
    //     Gecko implements neither see bug at
    //     https=//bugzilla.mozilla.org/show_bug.cgi?id=396927.
    // The DOM Events Level 3 Draft deprecates DOMFocusIn in favor of focusin=
    //     http=//dev.w3.org/2006/webapi/DOM-Level-3-Events/html/DOM3-Events.html
    // You can use FOCUS in Capture phase until implementations converge.
    FOCUSIN=  'focusin',
    FOCUSOUT= 'focusout',

    // Forms
    CHANGE= 'change',
    RESET= 'reset',
    SELECT= 'select',
    SUBMIT= 'submit',
    INPUT= 'input',
    PROPERTYCHANGE= 'propertychange',  // IE only

    // Drag and drop
    DRAGSTART= 'dragstart',
    DRAG= 'drag',
    DRAGENTER= 'dragenter',
    DRAGOVER= 'dragover',
    DRAGLEAVE= 'dragleave',
    DROP= 'drop',
    DRAGEND= 'dragend',

    // Touch events
    // Note that other touch events exist, but we should follow the W3C list here.
    // http=//www.w3.org/TR/touch-events/#list-of-touchevent-types
    TOUCHSTART= 'touchstart',
    TOUCHMOVE= 'touchmove',
    TOUCHEND= 'touchend',
    TOUCHCANCEL= 'touchcancel',

    // Misc
    BEFOREUNLOAD= 'beforeunload',
    CONSOLEMESSAGE= 'consolemessage',
    CONTEXTMENU= 'contextmenu',
    DOMCONTENTLOADED= 'DOMContentLoaded',
    ERROR= 'error',
    HELP= 'help',
    LOAD= 'load',
    LOSECAPTURE= 'losecapture',
    ORIENTATIONCHANGE= 'orientationchange',
    READYSTATECHANGE= 'readystatechange',
    RESIZE= 'resize',
    SCROLL= 'scroll',
    UNLOAD= 'unload',

    // HTML 5 History events
    // See http=//www.w3.org/TR/html5/browsers.html#event-definitions-0
    HASHCHANGE= 'hashchange',
    PAGEHIDE= 'pagehide',
    PAGESHOW= 'pageshow',
    POPSTATE= 'popstate',

    // Copy and Paste
    // Support is limited. Make sure it works on your favorite browser
    // before using.
    // http=//www.quirksmode.org/dom/events/cutcopypaste.html
    COPY= 'copy',
    PASTE= 'paste',
    CUT= 'cut',
    BEFORECOPY= 'beforecopy',
    BEFORECUT= 'beforecut',
    BEFOREPASTE= 'beforepaste',

    // HTML5 online/offline events.
    // http=//www.w3.org/TR/offline-webapps/#related
    ONLINE= 'online',
    OFFLINE= 'offline',

    // HTML 5 worker events
    MESSAGE= 'message',
    CONNECT= 'connect',

    // W3C Pointer Events
    // http=//www.w3.org/TR/pointerevents/
    POINTERDOWN= 'pointerdown',
    POINTERUP= 'pointerup',
    POINTERCANCEL= 'pointercancel',
    POINTERMOVE= 'pointermove',
    POINTEROVER= 'pointerover',
    POINTEROUT= 'pointerout',
    POINTERENTER= 'pointerenter',
    POINTERLEAVE= 'pointerleave',
    GOTPOINTERCAPTURE= 'gotpointercapture',
    LOSTPOINTERCAPTURE= 'lostpointercapture',

    // Native IMEs/input tools events.
    TEXT= 'text',
    TEXTINPUT= 'textInput',
    COMPOSITIONSTART= 'compositionstart',
    COMPOSITIONUPDATE= 'compositionupdate',
    COMPOSITIONEND= 'compositionend',

    // Webview tag events
    EXIT= 'exit',
    LOADABORT= 'loadabort',
    LOADCOMMIT= 'loadcommit',
    LOADREDIRECT= 'loadredirect',
    LOADSTART= 'loadstart',
    LOADSTOP= 'loadstop',
    RESPONSIVE= 'responsive',
    SIZECHANGED= 'sizechanged',
    UNRESPONSIVE= 'unresponsive',

    VISIBILITYCHANGE= 'visibilitychange',

    // LocalStorage event.
    STORAGE= 'storage',

    // DOM Level 2 mutation events (deprecated).
    DOMSUBTREEMODIFIED= 'DOMSubtreeModified',
    DOMNODEINSERTED= 'DOMNodeInserted',
    DOMNODEREMOVED= 'DOMNodeRemoved',
    DOMNODEREMOVEDFROMDOCUMENT= 'DOMNodeRemovedFromDocument',
    DOMNODEINSERTEDINTODOCUMENT= 'DOMNodeInsertedIntoDocument',
    DOMATTRMODIFIED= 'DOMAttrModified',
    DOMCHARACTERDATAMODIFIED= 'DOMCharacterDataModified',

    // Print events.
    BEFOREPRINT= 'beforeprint',
    AFTERPRINT= 'afterprint'
}