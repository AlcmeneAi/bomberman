export function Mini() {
  const mini = {
    children: [],
    state: {},
  };
  let oldNode = null;
  let renderedElements = [];
  const eventRegistry = {};
  let elementIdCounter = 0;
  let renderContainer = null;
  let renderFunction = null;
  let listenersAttached = false;
  const routes = {};
  function addGlobalEventListener(eventType, parent = document) {
    parent.addEventListener(eventType, (event) => {
      const elementId = event.target.dataset.eventId;

      if (
        elementId &&
        eventRegistry[elementId] &&
        eventRegistry[elementId][eventType]
      ) {
        eventRegistry[elementId][eventType](event);
      }
    });
  }

  return {
    createElement(tagName, props = {}, children = []) {
      return {
        tag: tagName,
        props: props,
        children: children,
      };
    },

    mount(fn, container) {
      renderFunction = fn;
      renderContainer = container;
      
      // Set initial route from URL hash or default to "#/home"
      const initialRoute = window.location.hash || "#/home";
      mini.state.currentRoute = initialRoute;
      
      // Listen for hash changes
      window.addEventListener("hashchange", () => {
        mini.state.currentRoute = window.location.hash || "#/home";
        this.render();
      });
      
      this.render();
      return this;
    },

    render() {
      if (!renderFunction || !renderContainer) return;

      // Call render function to get fresh vnode tree with current state
      const element = renderFunction();
      mini.children = [element];

      // Attach listeners only once
      if (!listenersAttached) {
        const supportedEvents = [
          "click",
          "input",
          "change",
          "keypress",
          "keydown",
          "keyup",
          "scroll",
          "submit",
          "focus",
          "blur",
          "mouseover",
          "mouseout",
          "mouseenter",
          "mouseleave",
          "dblclick",
        ];

        supportedEvents.forEach((eventType) => {
          addGlobalEventListener(eventType, renderContainer);
        });
        listenersAttached = true;
      }

      if (oldNode) {
        mini.children.forEach((newChild, index) => {
          const oldChild = oldNode.children[index];
          const result = diff(oldChild, newChild, renderedElements[index]);
          if (result) {
            renderedElements[index] = result;
          }
        });
      } else {
        renderedElements = [];
        renderContainer.innerHTML = "";
        mini.children.forEach((child) => {
          const element = createRealNode(child);
          renderContainer.appendChild(element);
          renderedElements.push(element);
        });
      }

      oldNode = JSON.parse(JSON.stringify(mini));

      function diff(oldElement, newElement, realElement) {
        if (oldElement.tag !== newElement.tag) {
          const newRealElement = createRealNode(newElement);
          realElement.replaceWith(newRealElement);
          return newRealElement;
        }

        for (const key in newElement.props) {
          if (newElement.props[key] !== oldElement.props[key]) {
            if (key.startsWith("on")) {
              const eventType = key.slice(2).toLowerCase();
              const elementId = realElement.dataset.eventId;
              if (elementId && eventRegistry[elementId]) {
                eventRegistry[elementId][eventType] = newElement.props[key];
              }
            } else {
              realElement.setAttribute(key, newElement.props[key]);
            }
          }
        }

        for (const key in oldElement.props) {
          if (!newElement.props[key]) {
            if (key.startsWith("on")) {
              const eventType = key.slice(2).toLowerCase();
              const elementId = realElement.dataset.eventId;
              if (elementId && eventRegistry[elementId]) {
                delete eventRegistry[elementId][eventType];
              }
            } else {
              realElement.removeAttribute(key);
            }
          }
        }

        const maxLength = Math.max(
          oldElement.children.length,
          newElement.children.length,
        );

        for (let i = 0; i < maxLength; i++) {
          const oldChild = oldElement.children[i];
          const newChild = newElement.children[i];
          const realChild = realElement.childNodes[i];

          if (typeof oldChild === "string" && typeof newChild === "string") {
            if (realChild && oldChild !== newChild) {
              realChild.textContent = newChild;
            }
            continue;
          }

          if (oldChild && newChild) {
            if (realChild) {
              diff(oldChild, newChild, realChild);
            }
          } else if (newChild && !oldChild) {
            realElement.appendChild(createRealNode(newChild));
          } else if (oldChild && !newChild) {
            if (realChild) {
              const elementId = realChild.dataset?.eventId;
              if (elementId && eventRegistry[elementId]) {
                delete eventRegistry[elementId];
              }
              realElement.removeChild(realChild);
            }
          }
        }

        // Remove extra child nodes that exist in DOM but not in newElement
        while (realElement.childNodes.length > newElement.children.length) {
          const lastChild = realElement.childNodes[realElement.childNodes.length - 1];
          const elementId = lastChild.dataset?.eventId;
          if (elementId && eventRegistry[elementId]) {
            delete eventRegistry[elementId];
          }
          realElement.removeChild(lastChild);
        }

        return realElement;
      }

      function createRealNode(vnode) {
        const element = document.createElement(vnode.tag);
        if (vnode.props) {
          Object.keys(vnode.props).forEach((key) => {
            if (key.startsWith("on")) {
              // Generate unique ID for this element
              const elementId = `elem-${elementIdCounter++}`;

              // Store handler in registry
              if (!eventRegistry[elementId]) {
                eventRegistry[elementId] = {};
              }

              const eventType = key.slice(2).toLowerCase();
              eventRegistry[elementId][eventType] = vnode.props[key];

              // Mark element with this ID
              element.dataset.eventId = elementId;
            } else {
              element.setAttribute(key, vnode.props[key]);
            }
          });
        }

        if (vnode.children) {
          vnode.children.forEach((child) => {
            if (typeof child === "string") {
              element.appendChild(document.createTextNode(child));
            } else {
              element.appendChild(createRealNode(child));
            }
          });
        }
        return element;
      }
    },
    setState(newState) {
      mini.state = Object.assign(mini.state, newState);
      this.render();
    },
    getState() {
      return mini.state;
    },
    getRoutes() {
      return routes;
    },
    route(path, component) {
      // Store route in registry
      routes[path] = component;
    },
    navigate(path) {
      window.location.hash = path;
    },
  };
}

export default Mini;

