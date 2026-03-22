import PieceTiles from '../PieceTiles/index.jsx';
import './index.scss';

function Piece({
  piece,
  area,
  isActive,
  isDragging,
  placementStyle,
  rotatedGeometry,
  rotatedCells,
  invalidSegmentIndexes,
  setPieceRef,
  setPieceBodyRef,
  onStartDrag,
  onFocusPiece,
  onRotateRight,
  onRotateRightAtPointer,
}) {
  const handlePieceDoubleClick = (event) => {
    onRotateRightAtPointer(event);
  };

  return (
    <div
      className={`piece ${piece.id} piece-${area} ${isDragging ? 'piece-dragging' : ''} ${isActive ? 'piece-active' : ''}`}
      data-piece-id={piece.id}
      ref={setPieceRef}
      style={placementStyle}
      onPointerDown={onStartDrag}
      onFocus={onFocusPiece}
      onDoubleClick={handlePieceDoubleClick}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          onFocusPiece();
          onRotateRight();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${piece.name}. Drag to move. Double tap or double click to rotate right. Arrow left or right rotates.${piece.canFlip !== false ? ' Arrow up or down flips vertically.' : ''} Board pieces show corner controls.`}
    >
      <div
        className="piece-body"
        ref={setPieceBodyRef}
        style={{
          width: '100%',
          height: '100%',
          transformOrigin: `calc((${rotatedGeometry.pivot[0]} + 0.5) * var(--piece-unit)) calc((${rotatedGeometry.pivot[1]} + 0.5) * var(--piece-unit))`,
        }}
      >
        <PieceTiles
          pieceId={piece.id}
          rotatedCells={rotatedCells}
          invalidSegmentIndexes={invalidSegmentIndexes}
        />
      </div>
    </div>
  );
}

export default Piece;
