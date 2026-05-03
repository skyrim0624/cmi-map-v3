import { lazy, type ReactNode } from 'react';

const MapView = lazy(() => import('./pages/MapView'));
const ListView = lazy(() => import('./pages/ListView'));
const PlaceDetail = lazy(() => import('./pages/PlaceDetail'));
const MarkPlace = lazy(() => import('./pages/MarkPlace'));
const PersonMap = lazy(() => import('./pages/PersonMap'));
const PlaygroundMarkPlace = lazy(() => import('./pages/PlaygroundMarkPlace'));
const PlaygroundWishlist = lazy(() => import('./pages/PlaygroundWishlist'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));

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
    name: '推荐人地图',
    path: '/people/:userName',
    element: <PersonMap />,
    public: true,
  },
  {
    name: '标记地点',
    path: '/mark',
    element: <MarkPlace />,
  },
  {
    name: '录入实验场',
    path: '/playground/mark',
    element: <PlaygroundMarkPlace />,
  },
  {
    name: '心愿实验场',
    path: '/playground/wishlist',
    element: <PlaygroundWishlist />,
  },
  {
    name: '个人页面',
    path: '/profile',
    element: <Profile />,
  }
];
