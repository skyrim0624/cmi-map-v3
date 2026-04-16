import MapView from './pages/MapView';
import ListView from './pages/ListView';
import PlaceDetail from './pages/PlaceDetail';
import MarkPlace from './pages/MarkPlace';
import Profile from './pages/Profile';
import Login from './pages/Login';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: '登录',
    path: '/login',
    element: <Login />,
    public: true,
  },
  {
    name: '地图查看',
    path: '/',
    element: <MapView />,
    public: true,
  },
  {
    name: '列表查看',
    path: '/list',
    element: <ListView />,
    public: true,
  },
  {
    name: '地点详情',
    path: '/place/:placeName',
    element: <PlaceDetail />,
    public: true,
  },
  {
    name: '标记地点',
    path: '/mark',
    element: <MarkPlace />,
  },
  {
    name: '个人页面',
    path: '/profile',
    element: <Profile />,
  }
];
