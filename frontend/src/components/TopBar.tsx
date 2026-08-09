export function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="mark">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 17.4C10 17.4 2.2 12.4 2.2 7.2C2.2 4.4 4.3 2.6 6.4 2.6C8 2.6 9.3 3.5 10 4.7C10.7 3.5 12 2.6 13.6 2.6C15.7 2.6 17.8 4.4 17.8 7.2C17.8 12.4 10 17.4 10 17.4Z"
              fill="none"
              stroke="#a0522d"
              strokeWidth="1.5"
            />
          </svg>
          Heart disease risk
        </span>
        <span className="topbar-meta">AdaBoost · UCI Heart Disease</span>
      </div>
    </header>
  );
}
