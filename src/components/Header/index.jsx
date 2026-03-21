import { useState } from 'react';
import DateDisplay from '../Date/index.jsx';
import Instructions from '../Instructions/index.jsx';
import Timer from '../Timer/index.jsx';
import './index.scss';

function Header({
  selection,
  timerStartedAt,
  isSolved,
  timerText,
  status,
  onReset,
}) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <section className="controls-wrap">
      <section className="controls">
        <div className="controls-summary">
          <DateDisplay selection={selection}>
            <Timer timerStartedAt={timerStartedAt} isSolved={isSolved} timerText={timerText} />
          </DateDisplay>
        </div>
        <div className="controls-actions">
          <button className="controls-button controls-button-muted reset" type="button" onClick={onReset}>
            Reset
          </button>
          <button
            className={`controls-button controls-button-muted controls-button-info ${showInfo ? 'controls-button-info-open' : ''}`}
            type="button"
            aria-expanded={showInfo}
            aria-controls="instructions-panel"
            aria-label={showInfo ? 'Hide instructions' : 'Show instructions'}
            onClick={() => setShowInfo((current) => !current)}
          >
            <span aria-hidden="true">i</span>
          </button>
        </div>
      </section>
      {showInfo ? (
        <div id="instructions-panel" className="controls-info-panel">
          <Instructions status={status} isSolved={isSolved} />
        </div>
      ) : null}
    </section>
  );
}

export default Header;
