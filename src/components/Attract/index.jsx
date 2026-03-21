import Confetti from 'react-confetti';
import './index.scss';

function Attract({
  showConfetti,
  confettiBurstKey,
  viewportSize,
  colors,
  showAttractScreen,
  attractMode,
  selection,
  timerText,
  onStart,
  onShare,
}) {
  const isResumeMode = attractMode === 'resume';
  const isSolvedMode = attractMode === 'solved';

  return (
    <>
      <Confetti
        key={confettiBurstKey}
        className={`attract-confetti ${showConfetti ? 'attract-confetti-visible' : 'attract-confetti-hidden'}`}
        width={viewportSize.width}
        height={viewportSize.height}
        run={showConfetti}
        recycle={showConfetti}
        numberOfPieces={520}
        tweenDuration={1400}
        gravity={0.24}
        initialVelocityY={20}
        initialVelocityX={9}
        colors={colors}
        confettiSource={{
          x: viewportSize.width * 0.5,
          y: 0,
          w: 0,
          h: 0,
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          pointerEvents: 'none',
        }}
      />

      <section
        className={`attract ${showAttractScreen ? 'attract-visible' : 'attract-hidden'}`}
        aria-hidden={!showAttractScreen}
      >
        <div className="attract-panel">
          <p className="attract-kicker">
            {isSolvedMode ? 'Puzzle Solved' : isResumeMode ? 'Game Paused' : 'Daily Logic Puzzle'}
          </p>
          <h1 className="attract-title">DateLock</h1>
          <p className="attract-copy">
            {isSolvedMode
              ? `You solved today's puzzle in ${timerText}!`
              : isResumeMode
                ? 'Your puzzle is paused where you left it. Jump back in when you are ready.'
                : 'Place all ten peices on the board without covering today\'s date!'}
          </p>

          <div className="attract-graphic" aria-hidden="true">
            <div className="attract-piece attract-piece-one" />
            <div className="attract-board-preview">
              <div className="attract-board-preview-frame">
                <div className="attract-board-preview-grid">
                  <span>{selection.month}</span>
                  <span>{selection.day}</span>
                  <span>{selection.weekday}</span>
                </div>
              </div>
            </div>
            <div className="attract-piece attract-piece-two" />
            <div className="attract-piece attract-piece-three" />
          </div>

          <div className="attract-actions">
            <button type="button" className="attract-button attract-button-primary" onClick={onStart}>
              {isSolvedMode ? 'Play Again' : isResumeMode ? 'Continue Game' : 'Play Today\'s Puzzle'}
            </button>
            <button type="button" className="attract-button attract-button-secondary" onClick={onShare}>
              {isSolvedMode ? 'Share Your Time' : 'Share with a Friend'}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export default Attract;
