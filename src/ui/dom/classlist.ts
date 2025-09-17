/**
 * Gets an array-like object of class names on an element.
 */
export function get(element:Element) : string[] {
  if (element.classList) {
      return [...element.classList];
  }

  let className = element.className;
  return className.match(/\S+/g) || [];
}


/**
 * Sets the entire class name of an element.
 * @param element DOM node to set class of.
 * @param className Class name(s) to apply to element.
 */
export function setAll(element:Element, classes:string[]) {
  element.className = classes.join(" ");
}

/**
 * Sets the entire class name of an element.
 * @param element DOM node to set class of.
 * @param className Class name(s) to apply to element.
 */
export function set(element:HTMLElement, className:string) {
  element.className = className;
}


/**
 * Returns true if an element has a class.  This method may throw a DOM
 * exception for an invalid or empty class name if DOMTokenList is used.
 * @param element DOM node to test.
 * @param className Class name to test for.
 * @return Whether element has the class.
 */
export function contains(element:Element, className:string) {
  return get(element).includes(className);
}


/**
 * Adds a class to an element.  Does not add multiples of class names.  This
 * method may throw a DOM exception for an invalid or empty class name if
 * DOMTokenList is used.
 * @param element DOM node to add class to.
 * @param className Class name to add.
 */
export function add(element:Element, className:string) {
  if (element.classList) {
    element.classList.add(className);
    return;
  }

  if (!contains(element, className)) {
    // Ensure we add a space if this is not the first class name added.
    element.className +=
        element.className.length > 0 ? (' ' + className) : className;
  }
}


/**
 * Convenience method to add a number of class names at once.
 * @param element The element to which to add classes.
 * @param classesToAdd An array-like object
 * containing a collection of class names to add to the element.
 * This method may throw a DOM exception if classesToAdd contains invalid
 * or empty class names.
 */
export function addAll(element:HTMLElement, classesToAdd: string[]) {
  if (element.classList) {
    for (let className of classesToAdd) {
      add(element, className);
    }
    return;
  }

  let classMap = new Set<string>();

  // Get all current class names into a map.
  for (let className of get(element)) {
    classMap.add(className);
  }

  // Add new class names to the map.
  for (let className of classesToAdd) {
    classMap.add(className);
  }

  // Flatten the keys of the map into the className.
  element.className = '';
  for (let className in classMap) {
    element.className +=
        element.className.length > 0 ? (' ' + className) : className;
  }
}

/**
 * Removes a class from an element.  This method may throw a DOM exception
 * for an invalid or empty class name if DOMTokenList is used.
 * @param element DOM node to remove class from.
 * @param className Class name to remove.
 */
export function remove(element:Element, className:string) {
  if (element.classList) {
    element.classList.remove(className);
    return;
  }

  if (contains(element, className)) {
    // Filter out the class name.
    element.className = get(element).filter(c=> c != className).join(' ');
  }
}



/**
 * Removes a set of classes from an element.  Prefer this call to
 * repeatedly calling {@code remove} if you want to remove
 * a large set of class names at once.
 * @param element The element from which to remove classes.
 * @param classesToRemove An array-like object
 * containing a collection of class names to remove from the element.
 * This method may throw a DOM exception if classesToRemove contains invalid
 * or empty class names.
 */
export function removeAll(element:Element, classesToRemove: string[]) {
  if (element.classList) {
    for (let className of classesToRemove) {
      remove(element, className);
    }
    return;
  }
  // Filter out those classes in classesToRemove.
  element.className = get(element).filter(className=> !classesToRemove.includes(className)).join(' ');
}


/**
 * Adds or removes a class depending on the enabled argument.  This method
 * may throw a DOM exception for an invalid or empty class name if DOMTokenList
 * is used.
 * @param element DOM node to add or remove the class on.
 * @param className Class name to add or remove.
 * @param enabled Whether to add or remove the class (true adds,
 *     false removes).
 */
export function enable(element:HTMLElement, className:string, enabled:boolean) {
  if (enabled) {
    add(element, className);
  } else {
    remove(element, className);
  }
}


/**
 * Adds or removes a set of classes depending on the enabled argument.  This
 * method may throw a DOM exception for an invalid or empty class name if
 * DOMTokenList is used.
 * @param element DOM node to add or remove the class on.
 * @param classesToEnable An array-like object
 *     containing a collection of class names to add or remove from the element.
 * @param enabled Whether to add or remove the classes (true adds,
 *     false removes).
 */
export function enableAll(element:HTMLElement, classesToEnable: string[], enabled:boolean) {
  let f = enabled ? addAll : removeAll;
  f(element, classesToEnable);
}


/**
 * Switches a class on an element from one to another without disturbing other
 * classes. If the fromClass isn't removed, the toClass won't be added.  This
 * method may throw a DOM exception if the class names are empty or invalid.
 * @param element DOM node to swap classes on.
 * @param fromClass Class to remove.
 * @param toClass Class to add.
 * @return Whether classes were switched.
 */
export function swap(element:HTMLElement, fromClass:string, toClass: string) {
  if (contains(element, fromClass)) {
    remove(element, fromClass);
    add(element, toClass);
    return true;
  }
  return false;
}


/**
 * Removes a class if an element has it, and adds it the element doesn't have
 * it.  Won't affect other classes on the node.  This method may throw a DOM
 * exception if the class name is empty or invalid.
 * @param element DOM node to toggle class on.
 * @param className Class to toggle.
 * @return True if class was added, false if it was removed
 *     (in other words, whether element has the class after this function has
 *     been called).
 */
export function toggle(element:HTMLElement, className:string) {
  let add = !contains(element, className);
  enable(element, className, add);
  return add;
}


/**
 * Adds and removes a class of an element.  Unlike
 * {@link swap}, this method adds the classToAdd regardless
 * of whether the classToRemove was present and had been removed.  This method
 * may throw a DOM exception if the class names are empty or invalid.
 *
 * @param element DOM node to swap classes on.
 * @param classToRemove Class to remove.
 * @param classToAdd Class to add.
 */
export function addRemove(element:HTMLElement, classToRemove:string, classToAdd:string) {
  remove(element, classToRemove);
  add(element, classToAdd);
}

const exportsFns  = {
  set, get,
  enable, enableAll,remove, removeAll, add, addAll, contains,
  toggle,
  addRemove, swap,
  setAll
}

export default  exportsFns;