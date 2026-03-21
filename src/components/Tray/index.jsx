import './index.scss';

function Tray({ trayRef }) {
  return (
    <aside ref={trayRef} className="tray">
      <div className="tray-grid" />
    </aside>
  );
}

export default Tray;
