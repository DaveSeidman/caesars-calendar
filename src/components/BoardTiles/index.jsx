import './index.scss';

function BoardTiles({ boardCells, selection, occupiedMap, cellKey, isTargetCell }) {
  return boardCells.map((cell) => {
    if (!cell.label) {
      return <div key={cell.id} className="board-cell board-cell-void" aria-hidden="true" />;
    }

    const revealed = isTargetCell(cell, selection);
    const covered = occupiedMap.has(cellKey(cell.row, cell.col));

    return (
      <div
        key={cell.id}
        className={`board-cell board-cell-${cell.type} ${revealed ? 'board-cell-target board-cell-locked' : ''} ${covered ? 'board-cell-covered' : ''}`}
      >
        <span className="board-cell-label">{cell.label}</span>
      </div>
    );
  });
}

export default BoardTiles;
