import { PIECES } from '../data/puzzle.js';
import { clamp, getPieceDimensions, getPointerAnchoredPosition } from './puzzleGeometry.js';

export const getTrayCellSize = (trayRect) =>
  trayRect.width <= 420 ? Math.min((window.innerWidth - 64) / 10, 32) : Math.min(window.innerWidth * 0.055, 40);

const packTrayLayout = (trayWidth, pieceUnit) => {
  const padding = Math.max(4, pieceUnit * 0.14);
  const gapX = Math.max(6, pieceUnit * 0.22);
  const gapY = Math.max(8, pieceUnit * 0.28);
  const availableWidth = Math.max(pieceUnit * 4, trayWidth - padding * 2);
  const items = PIECES.map((piece) => {
    const { widthCells, heightCells } = getPieceDimensions(piece);

    return {
      id: piece.id,
      width: widthCells * pieceUnit,
      height: heightCells * pieceUnit,
      widthCells,
      heightCells,
      area: piece.cells.length,
    };
  }).sort((left, right) => {
    if (right.heightCells !== left.heightCells) {
      return right.heightCells - left.heightCells;
    }

    if (right.area !== left.area) {
      return right.area - left.area;
    }

    return right.widthCells - left.widthCells;
  });

  const rows = [];
  let currentRow = { items: [], width: 0, height: 0 };

  items.forEach((item) => {
    const nextWidth = currentRow.items.length
      ? currentRow.width + gapX + item.width
      : item.width;

    if (currentRow.items.length && nextWidth > availableWidth) {
      rows.push(currentRow);
      currentRow = { items: [], width: 0, height: 0 };
    }

    currentRow.items.push(item);
    currentRow.width = currentRow.items.length === 1 ? item.width : currentRow.width + gapX + item.width;
    currentRow.height = Math.max(currentRow.height, item.height);
  });

  if (currentRow.items.length) {
    rows.push(currentRow);
  }

  const positions = {};
  let y = padding;

  rows.forEach((row) => {
    let x = padding + Math.max(0, (availableWidth - row.width) / 2);

    row.items.forEach((item) => {
      positions[item.id] = {
        x,
        y: y + (row.height - item.height) / 2,
      };
      x += item.width + gapX;
    });

    y += row.height + gapY;
  });

  return {
    pieceUnit,
    positions,
    height: y - gapY + padding,
  };
};

export const buildTrayLayout = (trayRect) => {
  if (!trayRect) {
    return null;
  }

  const basePieceUnit = getTrayCellSize(trayRect);
  let layout = packTrayLayout(trayRect.width, basePieceUnit);

  if (trayRect.height && layout.height > trayRect.height) {
    const scale = Math.max(0.72, (trayRect.height - 6) / layout.height);
    layout = packTrayLayout(trayRect.width, basePieceUnit * scale);
  }

  return layout;
};

export const clampTrayPosition = ({ x, y, width, height, pieceUnit, trayWidth, trayHeight }) => {
  if (!pieceUnit) {
    return { x, y };
  }

  const maxX = Math.max(0, trayWidth - width * pieceUnit);
  const maxY = Math.max(0, trayHeight - height * pieceUnit);

  return {
    x: clamp(x, 0, maxX),
    y: clamp(y, 0, maxY),
  };
};

export function getTrayDropPosition(pointerX, pointerY, trayRect, width, height, pieceUnit, pointerOffsetX, pointerOffsetY) {
  if (!trayRect) {
    return null;
  }

  const tolerance = 24;
  const insideX = pointerX >= trayRect.left - tolerance && pointerX <= trayRect.right + tolerance;
  const insideY = pointerY >= trayRect.top - tolerance && pointerY <= trayRect.bottom + tolerance;

  if (!insideX || !insideY) {
    return null;
  }

  const cellSize = pieceUnit || getTrayCellSize(trayRect);
  const anchoredPosition =
    typeof pointerOffsetX === 'number' && typeof pointerOffsetY === 'number'
      ? getPointerAnchoredPosition(pointerX, pointerY, pointerOffsetX, pointerOffsetY)
      : null;
  const rawX = anchoredPosition
    ? anchoredPosition.left - trayRect.left
    : pointerX - trayRect.left - (width * cellSize) / 2;
  const rawY = anchoredPosition
    ? anchoredPosition.top - trayRect.top
    : pointerY - trayRect.top - (height * cellSize) / 2;

  return clampTrayPosition({
    x: rawX,
    y: rawY,
    width,
    height,
    pieceUnit: cellSize,
    trayWidth: trayRect.width,
    trayHeight: trayRect.height,
  });
}
