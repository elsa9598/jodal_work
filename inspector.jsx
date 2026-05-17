// ImageInspector — fullscreen pinch-zoom + drag inspector for capture images.
// Touch: 1 finger drags, 2 fingers pinch-zoom.
// Mouse: wheel zooms (toward cursor), drag pans, double-click to reset.

function ImageInspector({ open, title, captureIndex, onClose }) {
  const stageRef = React.useRef(null);
  const innerRef = React.useRef(null);
  const [state, setState] = React.useState({ scale: 1, x: 0, y: 0 });
  const stateRef = React.useRef(state);
  stateRef.current = state;

  React.useEffect(() => {
    if (open) setState({ scale: 1, x: 0, y: 0 });
  }, [open, captureIndex]);

  const clamp = (s) => Math.max(1, Math.min(5, s));

  // Pointer / touch handling
  React.useEffect(() => {
    if (!open) return undefined;
    const stage = stageRef.current;
    if (!stage) return undefined;

    let pointers = new Map();
    let pinchStart = null;     // { dist, midX, midY, scale, tx, ty }
    let dragStart  = null;     // { x, y, tx, ty }

    const setStateRef = (next) => {
      stateRef.current = next;
      setState(next);
    };

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const mid  = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    const onDown = (e) => {
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        const cur = stateRef.current;
        dragStart = { x: e.clientX, y: e.clientY, tx: cur.x, ty: cur.y };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const m = mid(a, b);
        const cur = stateRef.current;
        pinchStart = {
          dist: dist(a, b),
          midX: m.x,
          midY: m.y,
          scale: cur.scale,
          tx: cur.x,
          ty: cur.y,
        };
        dragStart = null;
      }
    };

    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const newDist = dist(a, b);
        const newScale = clamp(pinchStart.scale * (newDist / pinchStart.dist));
        // pivot around start midpoint relative to stage center
        const rect = stage.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const localMidX = pinchStart.midX - cx;
        const localMidY = pinchStart.midY - cy;
        const ratio = newScale / pinchStart.scale;
        const tx = ratio * pinchStart.tx + (1 - ratio) * localMidX;
        const ty = ratio * pinchStart.ty + (1 - ratio) * localMidY;
        setStateRef({ scale: newScale, x: tx, y: ty });
      } else if (pointers.size === 1 && dragStart) {
        const cur = stateRef.current;
        if (cur.scale <= 1.001) return; // no panning when fully zoomed out
        setStateRef({
          ...cur,
          x: dragStart.tx + (e.clientX - dragStart.x),
          y: dragStart.ty + (e.clientY - dragStart.y),
        });
      }
    };

    const onUp = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size < 1) dragStart  = null;
      // when going from 2 → 1, refresh drag origin so the remaining finger
      // doesn't snap.
      if (pointers.size === 1) {
        const [a] = [...pointers.values()];
        const cur = stateRef.current;
        dragStart = { x: a.x, y: a.y, tx: cur.x, ty: cur.y };
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      const cur = stateRef.current;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = clamp(cur.scale * factor);
      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const localX = e.clientX - cx;
      const localY = e.clientY - cy;
      const ratio = newScale / cur.scale;
      setStateRef({
        scale: newScale,
        x: ratio * cur.x + (1 - ratio) * localX,
        y: ratio * cur.y + (1 - ratio) * localY,
      });
    };

    const onDouble = () => setStateRef({ scale: 1, x: 0, y: 0 });

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('dblclick', onDouble);
    return () => {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('dblclick', onDouble);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="zoom-overlay">
      <div className="zoom-head">
        <b>{title}</b>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            {state.scale.toFixed(1)}×
          </span>
          <button type="button" onClick={onClose} aria-label="닫기">✕</button>
        </div>
      </div>
      <div ref={stageRef} className="zoom-stage">
        <div ref={innerRef} style={{
          transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
          transformOrigin: 'center center',
          transition: 'none',
          width: 'min(92%, 360px)',
        }}>
          <MockCapture index={captureIndex} />
        </div>
        <div className="zoom-tip">두 손가락으로 확대 · 한 손가락으로 이동 · 더블 클릭으로 원래대로</div>
      </div>
    </div>
  );
}

window.ImageInspector = ImageInspector;
