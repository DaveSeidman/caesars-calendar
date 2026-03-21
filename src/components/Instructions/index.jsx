import './index.scss';

function Instructions({ status, isSolved }) {
  return (
    <p className={`status ${isSolved ? 'status-solved' : ''}`} aria-live="polite">
      {status}
    </p>
  );
}

export default Instructions;
