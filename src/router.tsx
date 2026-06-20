import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DayPage from './pages/DayPage';
import MapPage from './pages/MapPage';
import NotFoundPage from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: 'day/:day', Component: DayPage },
      { path: 'map', Component: MapPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
