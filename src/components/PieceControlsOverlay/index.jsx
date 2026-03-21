import { getPieceBounds, getTransformedGeometry } from '../../lib/puzzleGeometry.js';

function PieceControlsOverlay({
  activePieceId,
  dragPieceId,
  placements,
  piecesById,
  gameRect,
  boardGridRect,
  onSendToTray,
  onRotateRight,
  onFlipVertical,
}) {
  if (!activePieceId || dragPieceId === activePieceId) {
    return null;
  }

  const placement = placements[activePieceId];

  if (!placement || placement.col === null || !gameRect || !boardGridRect) {
    return null;
  }

  const piece = piecesById[activePieceId];
  const rotatedGeometry = getTransformedGeometry(
    piece.cells,
    piece.pivot,
    placement.rotation,
    placement.mirrored,
  );
  const bounds = getPieceBounds(rotatedGeometry.cells);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const pieceUnit = boardGridRect.width / 7;
  const left = boardGridRect.left - gameRect.left + placement.col * pieceUnit;
  const top = boardGridRect.top - gameRect.top + placement.row * pieceUnit;

  const handleControlPointerDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleControlDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleControlClick = (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  return (
    <div
      className="piece-controls piece-controls-overlay"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width * pieceUnit}px`,
        height: `${height * pieceUnit}px`,
        '--piece-unit': `${pieceUnit}px`,
      }}
    >
      <button
        type="button"
        className="piece-control piece-control-return"
        aria-label="Return piece to tray"
        onPointerDown={handleControlPointerDown}
        onDoubleClick={handleControlDoubleClick}
        onClick={(event) => handleControlClick(event, () => onSendToTray(piece.id))}
      >
        ×
      </button>
      <button
        type="button"
        className="piece-control piece-control-rotate-right"
        aria-label="Rotate right"
        onPointerDown={handleControlPointerDown}
        onDoubleClick={handleControlDoubleClick}
        onClick={(event) => handleControlClick(event, () => onRotateRight(piece.id))}
      >
        ↻
      </button>
      {piece.canFlip !== false ? (
        <button
          type="button"
          className="piece-control piece-control-flip-vertical"
          aria-label="Flip vertically"
          onPointerDown={handleControlPointerDown}
          onDoubleClick={handleControlDoubleClick}
          onClick={(event) => handleControlClick(event, () => onFlipVertical(piece.id))}
        >
          ⇅
        </button>
      ) : null}
    </div>
  );
}

export default PieceControlsOverlay;
