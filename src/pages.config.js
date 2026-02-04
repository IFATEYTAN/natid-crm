/**
 * pages.config.js - Page routing configuration
 *
 * Code splitting: Core pages load eagerly, all others lazy-loaded on demand.
 * This reduces initial bundle size significantly (maps, charts, etc. load only when needed).
 */
import { lazy } from 'react';

// Eagerly loaded - core pages used on every session
import Calls from './pages/Calls';
import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import VendorPortal from './pages/VendorPortal';
import __Layout from './Layout.jsx';

// Lazy loaded - loaded on demand when navigated to
const AdvancedExport = lazy(() => import('./pages/AdvancedExport'));
const Agents = lazy(() => import('./pages/Agents'));
const AllVendorsMap = lazy(() => import('./pages/AllVendorsMap'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const AutomationSettings = lazy(() => import('./pages/AutomationSettings'));
const Calendar = lazy(() => import('./pages/Calendar'));
const CallDetails = lazy(() => import('./pages/CallDetails'));
const CoverageAreas = lazy(() => import('./pages/CoverageAreas'));
const Customers = lazy(() => import('./pages/Customers'));
const HistoricalDataAnalysis = lazy(() => import('./pages/HistoricalDataAnalysis'));
const ImportHistoricalData = lazy(() => import('./pages/ImportHistoricalData'));
const IntegrationSettings = lazy(() => import('./pages/IntegrationSettings'));
const MyNotificationSettings = lazy(() => import('./pages/MyNotificationSettings'));
const MyQueue = lazy(() => import('./pages/MyQueue'));
const MyVendorProfile = lazy(() => import('./pages/MyVendorProfile'));
const NewVendor = lazy(() => import('./pages/NewVendor'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const QueueMonitor = lazy(() => import('./pages/QueueMonitor'));
const Reports = lazy(() => import('./pages/Reports'));
const ServiceProviders = lazy(() => import('./pages/ServiceProviders'));
const Settings = lazy(() => import('./pages/Settings'));
const UserGuide = lazy(() => import('./pages/UserGuide'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const VendorCallManagement = lazy(() => import('./pages/VendorCallManagement'));
const VendorContracts = lazy(() => import('./pages/VendorContracts'));
const VendorGuide = lazy(() => import('./pages/VendorGuide'));
const VendorTracking = lazy(() => import('./pages/VendorTracking'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const CustomerFeedback = lazy(() => import('./pages/CustomerFeedback'));

export const PAGES = {
  AdvancedExport: AdvancedExport,
  Agents: Agents,
  AllVendorsMap: AllVendorsMap,
  AuditLog: AuditLog,
  AutomationSettings: AutomationSettings,
  Calendar: Calendar,
  CallDetails: CallDetails,
  Calls: Calls,
  CoverageAreas: CoverageAreas,
  Customers: Customers,
  Dashboard: Dashboard,
  HistoricalDataAnalysis: HistoricalDataAnalysis,
  ImportHistoricalData: ImportHistoricalData,
  IntegrationSettings: IntegrationSettings,
  MyNotificationSettings: MyNotificationSettings,
  MyQueue: MyQueue,
  MyVendorProfile: MyVendorProfile,
  NewCase: NewCase,
  NewVendor: NewVendor,
  NotificationSettings: NotificationSettings,
  QueueMonitor: QueueMonitor,
  Reports: Reports,
  ServiceProviders: ServiceProviders,
  Settings: Settings,
  UserGuide: UserGuide,
  UserManagement: UserManagement,
  VendorCallManagement: VendorCallManagement,
  VendorContracts: VendorContracts,
  VendorGuide: VendorGuide,
  VendorPortal: VendorPortal,
  VendorTracking: VendorTracking,
  RoleManagement: RoleManagement,
  CustomerFeedback: CustomerFeedback,
};

export const pagesConfig = {
  mainPage: 'Dashboard',
  Pages: PAGES,
  Layout: __Layout,
};
