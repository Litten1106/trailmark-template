import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="space-y-3 text-center py-16">
    <h1 className="text-2xl font-bold">404</h1>
    <p className="text-slate-400">这条路在地图上没找到。</p>
    <Link to="/" className="inline-block text-sky-400 underline">
      回到首页
    </Link>
  </div>
);

export default NotFoundPage;
