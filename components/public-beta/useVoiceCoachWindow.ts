'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

type Rect = { left: number; top: number; width: number; height: number };
type Mode = 'move' | 'resize';
const GAP = 12;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 350;
const MINI_HEIGHT = 108;

function viewport() {
  const view = window.visualViewport;
  return { left: view?.offsetLeft ?? 0, top: view?.offsetTop ?? 0, width: view && view.width > 0 ? view.width : window.innerWidth, height: view && view.height > 0 ? view.height : window.innerHeight };
}

function constrain(rect: Rect, minimized: boolean): Rect {
  const view = viewport();
  const maxWidth = Math.max(1, view.width - GAP * 2);
  const maxHeight = Math.max(1, view.height - GAP * 2);
  const width = Math.min(maxWidth, Math.max(Math.min(MIN_WIDTH, maxWidth), rect.width));
  const height = Math.min(maxHeight, Math.max(Math.min(minimized ? MINI_HEIGHT : MIN_HEIGHT, maxHeight), rect.height));
  return {
    width, height,
    left: Math.max(view.left + GAP, Math.min(rect.left, view.left + view.width - GAP - width)),
    top: Math.max(view.top + GAP, Math.min(rect.top, view.top + view.height - GAP - height)),
  };
}

function initialRect(): Rect {
  const view = viewport();
  const width = Math.min(370, view.width - GAP * 2);
  const height = Math.min(610, view.height - 100);
  return constrain({ width, height, left: view.left + view.width - width - GAP, top: view.top + view.height - height - GAP }, false);
}

/** Geometry stays in memory and never changes the voice session or review state. */
export function useVoiceCoachWindow() {
  const [rect, setRect] = useState<Rect | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [manipulating, setManipulating] = useState(false);
  const expandedSize = useRef({ width: 370, height: 610 });
  const gesture = useRef<{ id: number; x: number; y: number; rect: Rect; mode: Mode } | null>(null);

  useEffect(() => {
    const fit = () => {
      gesture.current = null;
      setManipulating(false);
      setRect(current => current && constrain(current, minimized));
    };
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('scroll', fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('scroll', fit);
    };
  }, [minimized]);

  const open = () => {
    setRect(current => current ? constrain(minimized ? { ...current, ...expandedSize.current } : current, false) : initialRect());
    setMinimized(false);
  };
  const reset = () => {
    gesture.current = null; setManipulating(false);
    setRect(initialRect()); setMinimized(false);
  };
  const toggleMinimized = () => {
    if (!rect) return;
    gesture.current = null; setManipulating(false);
    if (minimized) setRect(constrain({ ...rect, ...expandedSize.current }, false));
    else {
      expandedSize.current = { width: rect.width, height: rect.height };
      setRect(constrain({ ...rect, width: Math.min(rect.width, 370), height: MINI_HEIGHT }, true));
    }
    setMinimized(!minimized);
  };

  const begin = (event: PointerEvent<HTMLButtonElement>, mode: Mode) => {
    if (event.button !== 0 || !event.isPrimary || !rect || (mode === 'resize' && minimized)) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rect, mode };
    setManipulating(true);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const start = gesture.current;
    if (!start || event.pointerId !== start.id) return;
    event.preventDefault();
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    setRect(constrain(start.mode === 'move'
      ? { ...start.rect, left: start.rect.left + dx, top: start.rect.top + dy }
      : { ...start.rect, width: start.rect.width + dx, height: start.rect.height + dy }, minimized));
  };
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null; setManipulating(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, mode: Mode) => {
    if (!rect) return;
    const amount = event.shiftKey ? 40 : 10;
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault(); event.stopPropagation();
    const [dx, dy] = direction.map(value => value * amount);
    setRect(constrain(mode === 'move'
      ? { ...rect, left: rect.left + dx, top: rect.top + dy }
      : { ...rect, width: rect.width + dx, height: rect.height + dy }, minimized));
  };
  const cancel = () => { gesture.current = null; setManipulating(false); };
  const drag = {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => begin(event, 'move'),
    onPointerMove: move, onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture: finish,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => keyboard(event, 'move'),
  };
  const resize = {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => begin(event, 'resize'),
    onPointerMove: move, onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture: finish,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => keyboard(event, 'resize'),
  };

  return { rect, minimized, manipulating, open, reset, toggleMinimized, cancel, drag, resize };
}
