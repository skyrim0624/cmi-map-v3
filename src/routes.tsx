import { lazy, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getSceneMapPath } from '@/lib/paths';

const MapView = lazy(() => import('./pages/MapView'));
const SceneHome = lazy(() => import('./pages/SceneHome'));
const CmiBlackboardPage = lazy(() => import('./pages/CmiBlackboardPage'));
const ListView = lazy(() => import('./pages/ListView'));
const PlaceDetail = lazy(() => import('./pages/PlaceDetail'));
const AddTrace = lazy(() => import('./pages/AddTrace'));
const CmiHome = lazy(() => import('./pages/CmiHome'));
const CmiEventDetail = lazy(() => import('./pages/CmiEventDetail'));
const CmiEventCreate = lazy(() => import('./pages/CmiEventCreate'));
const CmiEventManage = lazy(() => import('./pages/CmiEventManage'));
const AdminAgentTokens = lazy(() => import('./pages/AdminAgentTokens'));
const SurvivalGuides = lazy(() => import('./pages/SurvivalGuides'));
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
    name: '意图首页',
    path: '/',
    element: <SceneHome />,
    public: true,
  },
  {
    name: '地图查看',
    path: '/map',
    element: <MapView />,
    public: true,
  },
  {
    name: '一起出发看板',
    path: '/blackboard',
    element: <CmiBlackboardPage />,
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
    name: '补一句推荐',
    path: '/place/:placeName/add-trace',
    element: <AddTrace />,
  },
  {
    name: '清迈客栈',
    path: '/cmi-home',
    element: <CmiHome />,
    public: true,
  },
  {
    name: '活动详情',
    path: '/events/:eventId',
    element: <CmiEventDetail />,
    public: true,
  },
  {
    name: '发布活动',
    path: '/events/new',
    element: <CmiEventCreate />,
  },
  {
    name: '活动管理',
    path: '/events/:eventId/manage',
    element: <CmiEventManage />,
  },
  {
    name: 'Agent Token',
    path: '/admin/agent-tokens',
    element: <AdminAgentTokens />,
  },
  {
    name: '清迈生存地图',
    path: '/survival-kit',
    element: <Navigate to={getSceneMapPath('life-rescue')} replace />,
    public: true,
  },
  {
    name: '清迈落地攻略大全',
    path: '/survival-guides',
    element: <SurvivalGuides />,
    public: true,
  },
  {
    name: '推荐人地图',
    path: '/people/:profileIdentity',
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
