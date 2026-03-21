import { useEffect, useLayoutEffect, useRef } from 'react';
import { PIECES } from '../data/puzzle.js';

const DEBUG_DISABLE_PIECE_MOTION = false;

export function usePieceMotion({ layoutReady, dragPieceId, placements, pieceRefs, pieceBodyRefs }) {
  const previousRectsRef = useRef({});
  const previousPlacementsRef = useRef({});

  useLayoutEffect(() => {
    if (!layoutReady) {
      return;
    }

    if (DEBUG_DISABLE_PIECE_MOTION) {
      const nextRects = {};

      PIECES.forEach((piece) => {
        const element = pieceRefs.current[piece.id];

        if (!element || dragPieceId === piece.id) {
          return;
        }

        element.style.transition = 'none';
        element.style.transform = 'translate(0px, 0px)';
        nextRects[piece.id] = element.getBoundingClientRect();
      });

      previousRectsRef.current = nextRects;
      return;
    }

    const nextRects = {};

    PIECES.forEach((piece) => {
      const element = pieceRefs.current[piece.id];

      if (!element || dragPieceId === piece.id) {
        return;
      }

      const nextRect = element.getBoundingClientRect();
      const previousRect = previousRectsRef.current[piece.id];
      nextRects[piece.id] = nextRect;

      if (!previousRect) {
        return;
      }

      const dx = previousRect.left - nextRect.left;
      const dy = previousRect.top - nextRect.top;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        return;
      }

      element.style.transition = 'none';
      element.style.transform = `translate(${dx}px, ${dy}px)`;

      requestAnimationFrame(() => {
        element.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
        element.style.transform = 'translate(0px, 0px)';
      });
    });

    previousRectsRef.current = nextRects;
  }, [dragPieceId, layoutReady, pieceRefs, placements]);

  useLayoutEffect(() => {
    if (!layoutReady) {
      previousPlacementsRef.current = JSON.parse(JSON.stringify(placements));
      return;
    }

    if (DEBUG_DISABLE_PIECE_MOTION) {
      PIECES.forEach((piece) => {
        pieceBodyRefs.current[piece.id]?.getAnimations().forEach((animation) => animation.cancel());
      });
      previousPlacementsRef.current = JSON.parse(JSON.stringify(placements));
      return;
    }

    PIECES.forEach((piece) => {
      const currentPlacement = placements[piece.id];
      const previousPlacement = previousPlacementsRef.current[piece.id];
      const body = pieceBodyRefs.current[piece.id];

      if (!body || !previousPlacement || currentPlacement.motionNonce === previousPlacement.motionNonce) {
        return;
      }

      const duration = 240;
      const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
      let keyframes = null;

      if (currentPlacement.motion === 'rotate-right') {
        keyframes = [
          { transform: 'rotate(-90deg)' },
          { transform: 'rotate(0deg)' },
        ];
      }

      if (currentPlacement.motion === 'rotate-left') {
        keyframes = [
          { transform: 'rotate(90deg)' },
          { transform: 'rotate(0deg)' },
        ];
      }

      if (currentPlacement.motion === 'flip-horizontal') {
        keyframes = [
          { transform: 'perspective(760px) rotateY(180deg) scale(0.98)' },
          { transform: 'perspective(760px) rotateY(90deg) scale(0.94)', offset: 0.52 },
          { transform: 'perspective(760px) rotateY(0deg) scale(1)' },
        ];
      }

      if (currentPlacement.motion === 'flip-vertical') {
        keyframes = [
          { transform: 'perspective(760px) rotateX(180deg) scale(0.98)' },
          { transform: 'perspective(760px) rotateX(90deg) scale(0.94)', offset: 0.52 },
          { transform: 'perspective(760px) rotateX(0deg) scale(1)' },
        ];
      }

      if (keyframes) {
        body.getAnimations().forEach((animation) => animation.cancel());
        body.animate(keyframes, {
          duration,
          easing,
          fill: 'both',
        });
      }
    });

    previousPlacementsRef.current = JSON.parse(JSON.stringify(placements));
  }, [layoutReady, pieceBodyRefs, placements]);
}

export function useActivePieceKeyboardControls({ activePieceId, piecesById, applyPieceTransform }) {
  useEffect(() => {
    if (!activePieceId) {
      return undefined;
    }

    const activePiece = piecesById[activePieceId];

    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        applyPieceTransform(
          activePieceId,
          (piece) => ({
            ...piece,
            rotation: (piece.rotation + (event.key === 'ArrowLeft' ? 1 : 3)) % 4,
          }),
          event.key === 'ArrowLeft' ? 'rotate-left' : 'rotate-right',
        );
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (activePiece?.canFlip === false) {
          return;
        }

        event.preventDefault();
        applyPieceTransform(
          activePieceId,
          (piece) => ({
            ...piece,
            rotation: (piece.rotation + 2) % 4,
            mirrored: !piece.mirrored,
          }),
          'flip-vertical',
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePieceId, applyPieceTransform, piecesById]);
}

export function useOutsidePieceDeselect({ activePieceId, setActivePieceId }) {
  useEffect(() => {
    const handleGlobalPointerDown = (event) => {
      if (!activePieceId) {
        return;
      }

      if (event.target.closest('.piece') || event.target.closest('.piece-controls-overlay')) {
        return;
      }

      setActivePieceId(null);
    };

    window.addEventListener('pointerdown', handleGlobalPointerDown);

    return () => {
      window.removeEventListener('pointerdown', handleGlobalPointerDown);
    };
  }, [activePieceId, setActivePieceId]);
}
