var inputHandler;
var eventHandler;

function setUp() {
  eventHandler = new goog.events.EventHandler();
}

function tearDown() {
  goog.dispose(inputHandler);
  goog.dispose(eventHandler);
}

function testInputWithPlaceholder() {
  var input = goog.dom.getElement('input-w-placeholder');
  inputHandler = new goog.events.InputHandler(input);
  var callback = listenToInput(inputHandler);
  fireFakeInputEvent(input);
  assertEquals(0, callback.getCallCount());
}

function testInputWithPlaceholder_withValue() {
  var input = goog.dom.getElement('input-w-placeholder');
  inputHandler = new goog.events.InputHandler(input);
  var callback = listenToInput(inputHandler);
  input.value = 'foo';
  fireFakeInputEvent(input);
  assertEquals(0, callback.getCallCount());
}

function testInputWithPlaceholder_someKeys() {
  var input = goog.dom.getElement('input-w-placeholder');
  inputHandler = new goog.events.InputHandler(input);
  var callback = listenToInput(inputHandler);
  input.focus();
  input.value = 'foo';

  fireInputEvent(input, goog.events.KeyCodes.M);
  assertEquals(1, callback.getCallCount());
}

function listenToInput(inputHandler) {
  var callback = goog.testing.recordFunction();
  eventHandler.listen(
      inputHandler, goog.events.InputHandler.EventType.INPUT, callback);
  return callback;
}

function fireFakeInputEvent(input) {
  // Simulate the input event that IE fires on focus when a placeholder
  // is present.
  input.focus();
  if (goog.userAgent.IE && goog.userAgent.isVersionOrHigher(10)) {
    // IE fires an input event with keycode 0
    fireInputEvent(input, 0);
  }
}

function fireInputEvent(input, keyCode) {
  var inputEvent =
      new goog.testing.events.Event(goog.events.EventType.INPUT, input);
  inputEvent.keyCode = keyCode;
  inputEvent.charCode = keyCode;
  goog.testing.events.fireBrowserEvent(inputEvent);
}
