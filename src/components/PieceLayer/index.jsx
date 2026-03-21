import Piece from '../Piece/index.jsx';
import {
  getPieceBounds,
  getPointerAnchoredPosition,
  getTransformedGeometry,
} from '../../lib/puzzleGeometry.js';
import { getTrayCellSize } from '../../lib/trayLayout.js';

function PieceLayer({
  pieceIds,
  placements,
  piecesById,
  dragState,
  activePieceId,
  liveCellsByPiece,
  liveOccupiedCounts,
  pieceRefs,
  pieceBodyRefs,
  gameRect,
  boardGridRect,
  trayRect,
  trayLayout,
  getDefaultTrayPosition,
  onStartDrag,
  onFocusPiece,
  onRotateRight,
}) {
  const getPiecePlacementStyle = (pieceId) => {
    const placement = placements[pieceId];
    const piece = piecesById[pieceId];
    const rotatedGeometry = getTransformedGeometry(
      piece.cells,
      piece.pivot,
      placement.rotation,
      placement.mirrored,
    );
    const rotatedCells = rotatedGeometry.cells;
    const bounds = getPieceBounds(rotatedCells);
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;

    if (dragState?.pieceId === pieceId) {
      const pieceUnit = dragState.pieceUnit || 0;
      const dragPosition = getPointerAnchoredPosition(
        dragState.pointerX,
        dragState.pointerY,
        dragState.pointerOffsetX,
        dragState.pointerOffsetY,
      );

      return {
        position: 'fixed',
        left: `${dragPosition.left}px`,
        top: `${dragPosition.top}px`,
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
        ? getDefaultTrayPosition(pieceId)
        : { x: placement.trayX, y: placement.trayY };
    const trayPieceUnit = trayLayout?.pieceUnit ?? (trayRect ? getTrayCellSize(trayRect) : 0);

    return {
      left: `${trayRect && gameRect ? trayRect.left - gameRect.left + trayPosition.x : trayPosition.x}px`,
      top: `${trayRect && gameRect ? trayRect.top - gameRect.top + trayPosition.y : trayPosition.y}px`,
      '--piece-unit': `${trayPieceUnit}px`,
      '--piece-width': width,
      '--piece-height': height,
      zIndex: activePieceId === pieceId ? 8 : 2,
    };
  };

  return pieceIds.map((pieceId) => {
    const piece = piecesById[pieceId];
    const placement = placements[pieceId];
    const isActive = activePieceId === piece.id;
    const rotatedGeometry = getTransformedGeometry(
      piece.cells,
      piece.pivot,
      placement.rotation,
      placement.mirrored,
    );
    const rotatedCells = rotatedGeometry.cells;
    const invalidSegmentIndexes = new Set(
      (liveCellsByPiece[pieceId] ?? [])
        .filter(
          ({ key, onGrid, playable }) =>
            !onGrid || !playable || (key && (liveOccupiedCounts.get(key) ?? 0) > 1),
        )
        .map(({ index }) => index),
    );

    return (
      <Piece
        key={piece.id}
        piece={piece}
        area={placement.col !== null ? 'board' : 'tray'}
        isActive={isActive}
        isDragging={dragState?.pieceId === piece.id}
        placementStyle={getPiecePlacementStyle(piece.id)}
        rotatedGeometry={rotatedGeometry}
        rotatedCells={rotatedCells}
        invalidSegmentIndexes={invalidSegmentIndexes}
        setPieceRef={(node) => {
          if (dragState?.pieceId === piece.id) {
            return;
          }

          if (node) {
            pieceRefs.current[piece.id] = node;
          } else {
            delete pieceRefs.current[piece.id];
          }
        }}
        setPieceBodyRef={(node) => {
          if (node) {
            pieceBodyRefs.current[piece.id] = node;
          } else {
            delete pieceBodyRefs.current[piece.id];
          }
        }}
        onStartDrag={(event) => onStartDrag(event, piece.id)}
        onFocusPiece={() => onFocusPiece(piece.id)}
        onRotateRight={() => onRotateRight(piece.id)}
      />
    );
  });
}

export default PieceLayer;
