import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '../../components/layout/AppLayout';
import { DebugPage } from '../../pages/Debug/DebugPage';
import { GamePage } from '../../pages/Game/GamePage';
import { HomePage } from '../../pages/Home/HomePage';
import { ReviewPage } from '../../pages/Review/ReviewPage';
import { AppProviders } from '../providers/AppProviders';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppProviders>
        <AppLayout />
      </AppProviders>
    ),
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'game',
        element: <GamePage />,
      },
      {
        path: 'debug',
        element: <DebugPage />,
      },
      {
        path: 'review',
        element: <ReviewPage />,
      },
    ],
  },
]);
