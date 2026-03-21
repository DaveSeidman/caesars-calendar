import './index.scss';

function Share({ isSolved, shareFeedback, sharePulseKey, onShare }) {
  return (
    <button
      key={isSolved ? `share-solved-${sharePulseKey}` : 'share-default'}
      className={`controls-button controls-button-share ${isSolved && shareFeedback === 'idle' ? 'controls-button-share-pulse' : ''}`}
      type="button"
      onClick={onShare}
    >
      {shareFeedback === 'shared'
        ? 'Shared'
        : shareFeedback === 'copied'
          ? 'Copied'
          : shareFeedback === 'unavailable'
            ? 'Copy failed'
            : 'Share'}
    </button>
  );
}

export default Share;
