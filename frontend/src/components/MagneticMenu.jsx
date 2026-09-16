import { useEffect, useRef } from "react";

// One shared "magnetic" pill per menu container. It owns a single absolutely
// positioned `.magnetic-bubble` and glides/resizes it to whichever descendant
// `[data-mag]` item the cursor (or keyboard focus) is over.
//
// Key details (see plan): geometry is measured with getBoundingClientRect so it
// is offsetParent-agnostic (triggers sit inside nested `.relative` wrappers) and
// cancels the panel's own entrance transform; the `data-mag-root` guard scopes
// each instance to its own items so nested flyouts don't yank an ancestor's
// bubble; the bubble renders LAST and layers via z-index so it never perturbs
// the container's `space-y` / flex layout.
export default function MagneticMenu({
  as: Tag = "div",
  className = "",
  radius = "row", // "pill" | "row"
  restOnActive = false, // rest on [data-mag-active] instead of hiding
  restKey, // re-rest when this changes (e.g. selected folder id)
  itemSelector = "[data-mag]",
  children,
}) {
  const containerRef = useRef(null);
  const bubbleRef = useRef(null);
  const shownRef = useRef(false);

  function moveTo(item) {
    const c = containerRef.current;
    const b = bubbleRef.current;
    if (!c || !b || !item) return;
    const cr = c.getBoundingClientRect();
    const ir = item.getBoundingClientRect();
    const left = ir.left - cr.left + c.scrollLeft - c.clientLeft;
    const top = ir.top - cr.top + c.scrollTop - c.clientTop;
    const place = () => {
      b.style.width = `${ir.width}px`;
      b.style.height = `${ir.height}px`;
      b.style.transform = `translate(${left}px, ${top}px)`;
    };
    if (!shownRef.current) {
      // First reveal: snap into place (no glide from the corner).
      b.style.transition = "none";
      place();
      void b.offsetWidth; // force reflow so the snap commits
      b.style.transition = "";
      shownRef.current = true;
    } else {
      place();
    }
    b.setAttribute("data-show", "");
  }

  function rest() {
    const c = containerRef.current;
    const b = bubbleRef.current;
    if (restOnActive) {
      const active = c?.querySelector("[data-mag-active]");
      if (active) {
        moveTo(active);
        return;
      }
    }
    b?.removeAttribute("data-show");
  }

  function handlePoint(target) {
    const item = target.closest?.(itemSelector);
    if (!item || item.closest("[data-mag-root]") !== containerRef.current) return;
    moveTo(item);
  }

  function onMouseOver(e) {
    handlePoint(e.target);
  }
  function onFocus(e) {
    handlePoint(e.target);
  }
  function onBlur(e) {
    if (e.relatedTarget && containerRef.current?.contains(e.relatedTarget)) return;
    rest();
  }

  // Initial rest + re-rest on selection change / resize (sidebar only).
  useEffect(() => {
    if (!restOnActive) return undefined;
    rest();
    const onResize = () => rest();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restKey, restOnActive]);

  return (
    <Tag
      ref={containerRef}
      data-mag-root=""
      className={className}
      onMouseOver={onMouseOver}
      onMouseLeave={rest}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {children}
      <span ref={bubbleRef} className="magnetic-bubble" data-radius={radius} aria-hidden="true" />
    </Tag>
  );
}
