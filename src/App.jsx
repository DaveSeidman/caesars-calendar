import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BOARD_ROWS, MONTHS, PIECES, TRAY_SLOTS, WEEKDAYS } from './data/puzzle.js';

const TAP_ROTATE_MS = 280;
const MOVE_THRESHOLD = 8;

const getTodaySelection = () => {
  const now = new Date();

  return {
    month: MONTHS[now.getMonth()],
    day: String(now.getDate()),
    weekday: WEEKDAYS[now.getDay()],
  };
};

const getPieceBounds = (cells) => {
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

const transformPoint = ([x, y], rotation, flipX = false, flipY = false) => {
  let nextPoint = [x, y];

  if (flipX) {
    nextPoint = [-nextPoint[0], nextPoint[1]];
  }

  if (flipY) {
    nextPoint = [nextPoint[0], -nextPoint[1]];
  }

  for (let index = 0; index < rotation; index += 1) {
    nextPoint = [nextPoint[1], -nextPoint[0]];
  }

  return nextPoint;
};

const getTransformedGeometry = (cells, pivot, rotation, flipX = false, flipY = false) => {
  let nextCells = cells;

  if (flipX) {
    nextCells = nextCells.map(([x, y]) => [-x, y]);
  }

  if (flipY) {
    nextCells = nextCells.map(([x, y]) => [x, -y]);
  }

  for (let index = 0; index < rotation; index += 1) {
    nextCells = nextCells.map(([x, y]) => [y, -x]);
  }

  const bounds = getPieceBounds(nextCells);
  const transformedPivot = transformPoint(pivot, rotation, flipX, flipY);

  return {
    cells: nextCells.map(([x, y]) => [x - bounds.minX, y - bounds.minY]),
    pivot: [transformedPivot[0] - bounds.minX, transformedPivot[1] - bounds.minY],
  };
};

const getLabelType = (label) => {
  if (!label) return 'void';
  if (MONTHS.includes(label)) return 'month';
  if (WEEKDAYS.includes(label)) return 'weekday';
  return 'day';
};

const buildBoardCells = () =>
  BOARD_ROWS.flatMap((row, rowIndex) =>
    row.map((label, colIndex) => ({
      id: `${rowIndex}-${colIndex}`,
      row: rowIndex,
      col: colIndex,
      label,
      type: getLabelType(label),
      playable: Boolean(label),
    })),
  );

const createInitialPlacements = () =>
  PIECES.reduce((accumulator, piece, index) => {
    accumulator[piece.id] = {
      id: piece.id,
      rotation: 0,
      flipX: false,
      flipY: false,
      col: null,
      row: null,
      traySlot: index,
      motion: null,
      motionNonce: 0,
    };

    return accumulator;
  }, {});

const cellKey = (row, col) => `${row}-${col}`;

const isTargetCell = (cell, selection) =>
  cell.label === selection.month ||
  cell.label === selection.day ||
  cell.label === selection.weekday;

function App() {
  const gameRef = useRef(null);
  const boardRef = useRef(null);
  const boardGridRef = useRef(null);
  const trayRef = useRef(null);
  const pieceRefs = useRef({});
  const pieceBodyRefs = useRef({});
  const previousRectsRef = useRef({});
  const previousPlacementsRef = useRef({});
  const touchInfoRef = useRef({ pieceId: null, time: 0 });
  const [selection] = useState(getTodaySelection);
  const [placements, setPlacements] = useState(createInitialPlacements);
  const [dragState, setDragState] = useState(null);
  const [activePieceId, setActivePieceId] = useState(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const boardCells = useMemo(buildBoardCells, []);

  const getBoardCell = (row, col) => boardCells.find((cell) => cell.row === row && cell.col === col);

  const getDefaultTrayPosition = (traySlot) => {
    const slot = TRAY_SLOTS[traySlot];
    return {
      x: 14 + slot.col * 108,
      y: 14 + slot.row * 144,
    };
  };

  useLayoutEffect(() => {
    if (!layoutReady && gameRef.current && boardGridRef.current && trayRef.current) {
      setLayoutReady(true);
    }
  }, [layoutReady]);

  const canPlacePiece = (pieceId, placement, rotatedCells, candidatePlacements = placements) => {
    return rotatedCells.every(([x, y]) => {
      const row = placement.row + y;
      const col = placement.col + x;
      return row >= 0 && row < BOARD_ROWS.length && col >= 0 && col < BOARD_ROWS[0].length;
    });
  };

  const occupiedMap = useMemo(() => {
    const map = new Map();

    PIECES.forEach((piece) => {
      const placement = placements[piece.id];

      if (placement.col === null || placement.row === null) {
        return;
      }

      const rotatedCells = getTransformedGeometry(
        piece.cells,
        piece.pivot,
        placement.rotation,
        placement.flipX,
        placement.flipY,
      ).cells;
      rotatedCells.forEach(([x, y]) => {
        map.set(cellKey(placement.row + y, placement.col + x), piece.id);
      });
    });

    return map;
  }, [placements]);

  const placedCellsByPiece = useMemo(
    () =>
      Object.fromEntries(
        PIECES.map((piece) => {
          const placement = placements[piece.id];

          if (placement.col === null || placement.row === null) {
            return [piece.id, []];
          }

          const cells = getTransformedGeometry(
            piece.cells,
            piece.pivot,
            placement.rotation,
            placement.flipX,
            placement.flipY,
          ).cells.map(([x, y]) => ({
            row: placement.row + y,
            col: placement.col + x,
            key: cellKey(placement.row + y, placement.col + x),
          }));

          return [piece.id, cells];
        }),
      ),
    [placements],
  );

  const liveCellsByPiece = useMemo(() => {
    const result = { ...placedCellsByPiece };

    if (!dragState) {
      return result;
    }

    const boardRect = boardGridRef.current?.getBoundingClientRect();
    const piece = PIECES.find((entry) => entry.id === dragState.pieceId);
    const geometry = getTransformedGeometry(
      piece.cells,
      piece.pivot,
      dragState.rotation,
      dragState.flipX,
      dragState.flipY,
    );
    const projectedPlacement = getDropPlacement(dragState.pointerX, dragState.pointerY, boardRect, geometry.cells);

    result[dragState.pieceId] = projectedPlacement
      ? geometry.cells.map(([x, y], index) => {
          const row = projectedPlacement.row + y;
          const col = projectedPlacement.col + x;
          const inBounds = row >= 0 && row < BOARD_ROWS.length && col >= 0 && col < BOARD_ROWS[0].length;

          return {
            index,
            row,
            col,
            key: inBounds ? cellKey(row, col) : null,
            inBounds,
          };
        })
      : [];

    return result;
  }, [dragState, placedCellsByPiece]);

  const liveOccupiedCounts = useMemo(() => {
    const counts = new Map();

    Object.values(liveCellsByPiece).forEach((cells) => {
      cells.forEach(({ key, inBounds = true }) => {
        if (!key || !inBounds) {
          return;
        }

        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });

    return counts;
  }, [liveCellsByPiece]);

  const ghostPlacement = useMemo(() => {
    if (!dragState) {
      return null;
    }

    const boardRect = boardRef.current?.getBoundingClientRect();
    const piece = PIECES.find((entry) => entry.id === dragState.pieceId);
    const rotatedCells = getTransformedGeometry(
      piece.cells,
      piece.pivot,
      dragState.rotation,
      dragState.flipX,
      dragState.flipY,
    ).cells;
    const nextPlacement = getDropPlacement(dragState.pointerX, dragState.pointerY, boardRect, rotatedCells);

    if (!nextPlacement || !canPlacePiece(dragState.pieceId, nextPlacement, rotatedCells)) {
      return null;
    }

    return {
      pieceId: dragState.pieceId,
      placement: nextPlacement,
      cells: rotatedCells,
      bounds: getPieceBounds(rotatedCells),
    };
  }, [dragState, placements]);

  const status = useMemo(() => {
    const playableCells = boardCells.filter((cell) => cell.playable);
    const uncoveredTargets = playableCells.filter((cell) => isTargetCell(cell, selection));
    const coveredTargets = uncoveredTargets.filter((cell) => occupiedMap.has(cellKey(cell.row, cell.col)));
    const coveredPlayableCells = playableCells.filter((cell) => occupiedMap.has(cellKey(cell.row, cell.col)));
    const allPiecesPlaced = PIECES.every((piece) => placements[piece.id].col !== null);
    const solved =
      allPiecesPlaced &&
      coveredTargets.length === 0 &&
      coveredPlayableCells.length === playableCells.length - 3;

    if (solved) {
      return `Solved for ${selection.month} ${selection.day}, ${selection.weekday}.`;
    }

    if (coveredTargets.length > 0) {
      return 'A target cell is covered. Leave today’s month, date, and weekday visible.';
    }

    return 'Drag pieces onto the board. As you move, a snapped outline shows exactly where the piece will land.';
  }, [boardCells, occupiedMap, placements, selection]);

  useLayoutEffect(() => {
    if (!layoutReady) {
      return;
    }

    const nextRects = {};

    PIECES.forEach((piece) => {
      const element = pieceRefs.current[piece.id];

      if (!element || dragState?.pieceId === piece.id) {
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
        element.style.transition = 'transform 880ms cubic-bezier(0.22, 1, 0.36, 1)';
        element.style.transform = 'translate(0px, 0px)';
      });
    });

    previousRectsRef.current = nextRects;
  }, [dragState?.pieceId, layoutReady, placements]);

  useLayoutEffect(() => {
    if (!layoutReady) {
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

      const duration = 320;
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
          { transform: 'scaleX(-1)' },
          { transform: 'scaleX(1)' },
        ];
      }

      if (currentPlacement.motion === 'flip-vertical') {
        keyframes = [
          { transform: 'scaleY(-1)' },
          { transform: 'scaleY(1)' },
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
  }, [layoutReady, placements]);

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      setDragState((current) => {
        if (!current) {
          return current;
        }

        const moved =
          current.moved ||
          Math.abs(event.clientX - current.startX) > MOVE_THRESHOLD ||
          Math.abs(event.clientY - current.startY) > MOVE_THRESHOLD;

        const nextState = {
          ...current,
          pointerX: event.clientX,
          pointerY: event.clientY,
          moved,
        };

        return nextState;
      });
    };

    const handlePointerUp = (event) => {
      const boardRect = boardRef.current?.getBoundingClientRect();
      const trayRect = trayRef.current?.getBoundingClientRect();
      const piece = PIECES.find((entry) => entry.id === dragState.pieceId);
      const rotatedCells = getTransformedGeometry(
        piece.cells,
        piece.pivot,
        dragState.rotation,
        dragState.flipX,
        dragState.flipY,
      ).cells;

      if (event.pointerType !== 'mouse' && !dragState.moved) {
        const lastTouch = touchInfoRef.current;
        const now = Date.now();

        if (lastTouch.pieceId === dragState.pieceId && now - lastTouch.time < TAP_ROTATE_MS) {
          setPlacements((current) => ({
            ...current,
            [dragState.pieceId]: {
              ...current[dragState.pieceId],
              rotation: (current[dragState.pieceId].rotation + 1) % 4,
              motion: 'rotate-right',
              motionNonce: current[dragState.pieceId].motionNonce + 1,
            },
          }));
          touchInfoRef.current = { pieceId: null, time: 0 };
        } else {
          touchInfoRef.current = { pieceId: dragState.pieceId, time: now };
        }

        setActivePieceId(dragState.pieceId);
        setDragState(null);
        return;
      }

      const nextPlacement = getDropPlacement(event.clientX, event.clientY, boardRect, rotatedCells);
      const nextTrayPosition = getTrayDropPosition(
        event.clientX,
        event.clientY,
        trayRect,
        dragState.width,
        dragState.height,
      );

      setPlacements((current) => {
        const result = {
          ...current,
          [dragState.pieceId]: {
            ...current[dragState.pieceId],
            col: null,
            row: null,
          },
        };

        if (nextPlacement && canPlacePiece(dragState.pieceId, nextPlacement, rotatedCells, result)) {
          result[dragState.pieceId] = {
            ...result[dragState.pieceId],
            col: nextPlacement.col,
            row: nextPlacement.row,
          };
        } else if (nextTrayPosition) {
          result[dragState.pieceId] = {
            ...result[dragState.pieceId],
            trayX: nextTrayPosition.x,
            trayY: nextTrayPosition.y,
          };
        } else if (dragState.originTrayPosition) {
          result[dragState.pieceId] = {
            ...result[dragState.pieceId],
            trayX: dragState.originTrayPosition.x,
            trayY: dragState.originTrayPosition.y,
          };
        } else if (dragState.originBoardPosition) {
          result[dragState.pieceId] = {
            ...result[dragState.pieceId],
            col: dragState.originBoardPosition.col,
            row: dragState.originBoardPosition.row,
          };
        }

        return result;
      });

      setActivePieceId(dragState.pieceId);
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, placements]);

  const applyPieceTransform = (pieceId, updater, motion) => {
    setPlacements((current) => ({
      ...current,
      [pieceId]: {
        ...updater(current[pieceId]),
        motion,
        motionNonce: current[pieceId].motionNonce + 1,
      },
    }));
    setActivePieceId(pieceId);
  };

  useEffect(() => {
    if (!activePieceId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        applyPieceTransform(activePieceId, (piece) => ({
          ...piece,
          rotation: (piece.rotation + (event.key === 'ArrowLeft' ? 3 : 1)) % 4,
        }), event.key === 'ArrowLeft' ? 'rotate-left' : 'rotate-right');
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        applyPieceTransform(
          activePieceId,
          (piece) =>
            event.key === 'ArrowUp'
              ? { ...piece, flipY: !piece.flipY }
              : { ...piece, flipX: !piece.flipX },
          event.key === 'ArrowUp' ? 'flip-vertical' : 'flip-horizontal',
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePieceId]);

  const rotatePieceRight = (pieceId) =>
    applyPieceTransform(
      pieceId,
      (piece) => ({ ...piece, rotation: (piece.rotation + 1) % 4 }),
      'rotate-right',
    );

  const resetBoard = () => {
    setPlacements(createInitialPlacements());
    setDragState(null);
    setActivePieceId(null);
    touchInfoRef.current = { pieceId: null, time: 0 };
  };

  const startDrag = (event, pieceId) => {
    const piece = PIECES.find((entry) => entry.id === pieceId);
    const placement = placements[pieceId];
    const rotatedCells = getTransformedGeometry(
      piece.cells,
      piece.pivot,
      placement.rotation,
      placement.flipX,
      placement.flipY,
    ).cells;
    const bounds = getPieceBounds(rotatedCells);
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    const sourceRect = event.currentTarget.getBoundingClientRect();
    const boardGridRect = boardGridRef.current?.getBoundingClientRect();
    const pieceUnit =
      placement.col !== null && boardGridRect
        ? boardGridRect.width / 7
        : sourceRect.width / width;

    event.preventDefault();
    setActivePieceId(pieceId);

    const nextDragState = {
      pieceId,
      rotation: placement.rotation,
      flipX: placement.flipX,
      flipY: placement.flipY,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      pieceUnit,
      width,
      height,
      originTrayPosition:
        placement.col === null
          ? {
              x: placement.trayX ?? getDefaultTrayPosition(placement.traySlot).x,
              y: placement.trayY ?? getDefaultTrayPosition(placement.traySlot).y,
            }
          : null,
      originBoardPosition:
        placement.col !== null
          ? {
              col: placement.col,
              row: placement.row,
            }
          : null,
    };

    setDragState(nextDragState);
  };

  const getPiecePlacementStyle = (pieceId) => {
    const placement = placements[pieceId];
    const piece = PIECES.find((entry) => entry.id === pieceId);
    const rotatedGeometry = getTransformedGeometry(
      piece.cells,
      piece.pivot,
      placement.rotation,
      placement.flipX,
      placement.flipY,
    );
    const rotatedCells = rotatedGeometry.cells;
    const bounds = getPieceBounds(rotatedCells);
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    const gameRect = gameRef.current?.getBoundingClientRect();
    const boardGridRect = boardGridRef.current?.getBoundingClientRect();
    const trayRect = trayRef.current?.getBoundingClientRect();

    if (dragState?.pieceId === pieceId) {
      const pieceUnit = dragState.pieceUnit || 0;

      return {
        position: 'fixed',
        left: `${dragState.pointerX - (width * pieceUnit) / 2}px`,
        top: `${dragState.pointerY - (height * pieceUnit) / 2}px`,
        width: `${width * pieceUnit}px`,
        height: `${height * pieceUnit}px`,
        '--piece-unit': `${pieceUnit}px`,
        transform: 'translate(0px, 0px)',
        transition: 'none',
        zIndex: 30,
      };
    }

    if (placement.col !== null) {
      const cellSize = boardGridRect ? boardGridRect.width / 7 : 0;
      const left = boardGridRect && gameRect ? boardGridRect.left - gameRect.left + placement.col * cellSize : 0;
      const top = boardGridRect && gameRect ? boardGridRect.top - gameRect.top + placement.row * cellSize : 0;

      return {
        left: `${left}px`,
        top: `${top}px`,
        '--piece-unit': `${cellSize}px`,
        '--piece-width': width,
        '--piece-height': height,
        zIndex: activePieceId === pieceId ? 24 : 4,
      };
    }

    const trayPosition =
      placement.trayX === undefined || placement.trayY === undefined
        ? getDefaultTrayPosition(placement.traySlot)
        : { x: placement.trayX, y: placement.trayY };

    return {
      left: `${trayRect && gameRect ? trayRect.left - gameRect.left + trayPosition.x : trayPosition.x}px`,
      top: `${trayRect && gameRect ? trayRect.top - gameRect.top + trayPosition.y : trayPosition.y}px`,
      '--piece-unit': 'var(--tray-cell)',
      '--piece-width': width,
      '--piece-height': height,
      zIndex: activePieceId === pieceId ? 8 : 2,
    };
  };

  const renderPiece = (pieceId, area) => {
    const piece = PIECES.find((entry) => entry.id === pieceId);
    const placement = placements[pieceId];
    const rotatedGeometry = getTransformedGeometry(
      piece.cells,
      piece.pivot,
      placement.rotation,
      placement.flipX,
      placement.flipY,
    );
    const rotatedCells = rotatedGeometry.cells;
    const invalidSegmentIndexes = new Set(
      (liveCellsByPiece[pieceId] ?? [])
        .filter(({ key, inBounds }) => !inBounds || (key && (liveOccupiedCounts.get(key) ?? 0) > 1))
        .map(({ index }) => index),
    );

    return (
      <div
        key={piece.id}
        className={`piece ${piece.id} piece-${area} ${dragState?.pieceId === piece.id ? 'piece-dragging' : ''} ${activePieceId === piece.id ? 'piece-active' : ''
          }`}
        ref={(node) => {
          if (dragState?.pieceId === piece.id) {
            return;
          }

          if (node) {
            pieceRefs.current[piece.id] = node;
          } else {
            delete pieceRefs.current[piece.id];
          }
        }}
        style={getPiecePlacementStyle(piece.id)}
        onPointerDown={(event) => startDrag(event, piece.id)}
        onDoubleClick={() => rotatePieceRight(piece.id)}
        onKeyDown={(event) => {
          if (
            event.key === 'ArrowLeft' ||
            event.key === 'ArrowRight' ||
            event.key === 'ArrowUp' ||
            event.key === 'ArrowDown' ||
            event.key === ' '
          ) {
            event.preventDefault();
            setActivePieceId(piece.id);

            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              applyPieceTransform(
                piece.id,
                (current) => ({
                  ...current,
                  rotation: (current.rotation + (event.key === 'ArrowLeft' ? 3 : 1)) % 4,
                }),
                event.key === 'ArrowLeft' ? 'rotate-left' : 'rotate-right',
              );
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              applyPieceTransform(
                piece.id,
                (current) =>
                  event.key === 'ArrowUp'
                    ? { ...current, flipY: !current.flipY }
                    : { ...current, flipX: !current.flipX },
                event.key === 'ArrowUp' ? 'flip-vertical' : 'flip-horizontal',
              );
            } else {
              rotatePieceRight(piece.id);
            }
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`${piece.name}. Drag to move. Double tap or double click to rotate right. Arrow left or right rotates. Arrow up flips vertically. Arrow down flips horizontally.`}
      >
        <div
          className="piece-body"
          ref={(node) => {
            if (node) {
              pieceBodyRefs.current[piece.id] = node;
            } else {
              delete pieceBodyRefs.current[piece.id];
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            transformOrigin: `calc((${rotatedGeometry.pivot[0]} + 0.5) * var(--piece-unit)) calc((${rotatedGeometry.pivot[1]} + 0.5) * var(--piece-unit))`,
          }}
        >
          {rotatedCells.map(([x, y], index) => (
            <span
              key={`${piece.id}-${index}`}
              className={`piece-segment ${invalidSegmentIndexes.has(index) ? 'piece-segment-error' : ''}`}
              style={{
                left: `calc(${x} * var(--piece-unit))`,
                top: `calc(${y} * var(--piece-unit))`,
                '--grain-x': `calc(${x} * -1 * var(--piece-unit))`,
                '--grain-y': `calc(${y} * -1 * var(--piece-unit))`,
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderGhostOverlay = () => {
    if (!ghostPlacement || !gameRef.current || !boardGridRef.current) {
      return null;
    }

    const gameRect = gameRef.current.getBoundingClientRect();
    const boardGridRect = boardGridRef.current.getBoundingClientRect();
    const cellSize = boardGridRect.width / 7;
    const offsetLeft = boardGridRect.left - gameRect.left;
    const offsetTop = boardGridRect.top - gameRect.top;

    return ghostPlacement.cells.map(([x, y], index) => (
      <span
        key={`ghost-${ghostPlacement.pieceId}-${index}`}
        className="ghost-cell"
        style={{
          left: `${offsetLeft + (ghostPlacement.placement.col + x) * cellSize}px`,
          top: `${offsetTop + (ghostPlacement.placement.row + y) * cellSize}px`,
          width: `${cellSize}px`,
          height: `${cellSize}px`,
        }}
      />
    ));
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <h1 className="hero-title">Caesar&apos;s Calendar Puzzle</h1>
        <p className="hero-copy">
          Arrange the wooden pieces so today&apos;s month, date, and weekday remain visible.
        </p>
      </section>

      <section className="controls">
        <div className="controls-field controls-field-static">
          <span>Today</span>
          <strong>
            {selection.month} {selection.day}, {selection.weekday}
          </strong>
        </div>
        <button className="controls-button controls-button-muted" type="button" onClick={resetBoard}>
          Reset pieces
        </button>
      </section>

      <section ref={gameRef} className="game">
        <div className="board-panel">
          <div className="board-frame">
            <div ref={boardRef} className="board">
              <div ref={boardGridRef} className="board-grid" aria-hidden="true">
                {boardCells.map((cell) => {
                  if (!cell.label) {
                    return <div key={cell.id} className="board-cell board-cell-void" aria-hidden="true" />;
                  }

                  const revealed = isTargetCell(cell, selection);
                  const covered = occupiedMap.has(cellKey(cell.row, cell.col));
                  return (
                    <div
                      key={cell.id}
                      className={`board-cell board-cell-${cell.type} ${revealed ? 'board-cell-target' : ''} ${covered ? 'board-cell-covered' : ''
                        }`}
                    >
                      {cell.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="status" aria-live="polite">
            {status}
          </p>
        </div>

        <aside className="tray">
          <div className="tray-header">
            <h2>Pieces</h2>
            <p>Drag to move. Arrow left or right rotates. Arrow up flips vertically. Arrow down flips horizontally.</p>
          </div>
          <div ref={trayRef} className="tray-grid">
          </div>
        </aside>

        <div className="game-piece-layer">
          {layoutReady
            ? PIECES.filter((piece) => piece.id !== dragState?.pieceId).map((piece) =>
                renderPiece(piece.id, placements[piece.id].col !== null ? 'board' : 'tray'),
              )
            : null}
        </div>
        <div className="game-ghost-layer" aria-hidden="true">
          {layoutReady ? renderGhostOverlay() : null}
        </div>
        <div className="game-drag-layer">
          {layoutReady && dragState ? renderPiece(dragState.pieceId, placements[dragState.pieceId].col !== null ? 'board' : 'tray') : null}
        </div>
      </section>
    </main>
  );
}

function getDropPlacement(pointerX, pointerY, boardRect, rotatedCells) {
  if (!boardRect) {
    return null;
  }

  const cellSize = boardRect.width / 7;
  const boardX = pointerX - boardRect.left;
  const boardY = pointerY - boardRect.top;
  const bounds = getPieceBounds(rotatedCells);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;

  const col = Math.round((boardX - (width * cellSize) / 2) / cellSize);
  const row = Math.round((boardY - (height * cellSize) / 2) / cellSize);

  if (Number.isNaN(col) || Number.isNaN(row)) {
    return null;
  }

  return { col, row };
}

function getTrayDropPosition(pointerX, pointerY, trayRect, width, height) {
  if (!trayRect) {
    return null;
  }

  const insideX = pointerX >= trayRect.left && pointerX <= trayRect.right;
  const insideY = pointerY >= trayRect.top && pointerY <= trayRect.bottom;

  if (!insideX || !insideY) {
    return null;
  }

  const cellSize = trayRect.width <= 420 ? Math.min((window.innerWidth - 58) / 7, 59.2) : Math.min(window.innerWidth * 0.07, 69.6);
  const rawX = pointerX - trayRect.left - (width * cellSize) / 2;
  const rawY = pointerY - trayRect.top - (height * cellSize) / 2;
  const maxX = Math.max(0, trayRect.width - width * cellSize);
  const maxY = Math.max(0, trayRect.height - height * cellSize);

  return {
    x: Math.min(Math.max(0, rawX), maxX),
    y: Math.min(Math.max(0, rawY), maxY),
  };
}

export default App;
