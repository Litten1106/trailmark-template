import { Link } from 'react-router-dom';

const JourneyTopBar = () => {
  return (
    <div className="journey-topbar">
      <Link to="/" className="journey-topbar__back" aria-label="返回行程列表">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M19 12H5m7-7l-7 7 7 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </div>
  );
};

export default JourneyTopBar;
