import './App.css';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { preloadJourneyMap } from './lib/mapPreload';

const App = () => {
  useEffect(() => {
    preloadJourneyMap();
  }, []);

  return <RouterProvider router={router} />;
};

export default App;
