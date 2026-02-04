/**
 * pages.config.js - Page routing configuration
 *
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 *
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 *
 * Example file structure:
 *
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 *
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminDisplaySettings from './pages/AdminDisplaySettings';
import AdvancedExport from './pages/AdvancedExport';
import Agents from './pages/Agents';
import AllVendorsMap from './pages/AllVendorsMap';
import AuditLog from './pages/AuditLog';
import AutomationSettings from './pages/AutomationSettings';
import Calendar from './pages/Calendar';
import CallDetails from './pages/CallDetails';
import Calls from './pages/Calls';
import CoverageAreas from './pages/CoverageAreas';
import CustomerDetails from './pages/CustomerDetails';
import CustomerFeedback from './pages/CustomerFeedback';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import HistoricalDataAnalysis from './pages/HistoricalDataAnalysis';
import ImportHistoricalData from './pages/ImportHistoricalData';
import LandingPage from './pages/LandingPage';
import IntegrationSettings from './pages/IntegrationSettings';
import MyNotificationSettings from './pages/MyNotificationSettings';
import MyQueue from './pages/MyQueue';
import MyVendorProfile from './pages/MyVendorProfile';
import NewCase from './pages/NewCase';
import NewVendor from './pages/NewVendor';
import NotificationSettings from './pages/NotificationSettings';
import QueueMonitor from './pages/QueueMonitor';
import Reports from './pages/Reports';
import RoleManagement from './pages/RoleManagement';
import ServiceProviders from './pages/ServiceProviders';
import Settings from './pages/Settings';
import UserGuide from './pages/UserGuide';
import UserManagement from './pages/UserManagement';
import VendorCallManagement from './pages/VendorCallManagement';
import VendorContracts from './pages/VendorContracts';
import VendorGuide from './pages/VendorGuide';
import VendorPortal from './pages/VendorPortal';
import VendorTracking from './pages/VendorTracking';
import __Layout from './Layout.jsx';

export const PAGES = {
  AdminDisplaySettings: AdminDisplaySettings,
  AdvancedExport: AdvancedExport,
  Agents: Agents,
  AllVendorsMap: AllVendorsMap,
  AuditLog: AuditLog,
  AutomationSettings: AutomationSettings,
  Calendar: Calendar,
  CallDetails: CallDetails,
  Calls: Calls,
  CoverageAreas: CoverageAreas,
  CustomerDetails: CustomerDetails,
  CustomerFeedback: CustomerFeedback,
  Customers: Customers,
  Dashboard: Dashboard,
  HistoricalDataAnalysis: HistoricalDataAnalysis,
  ImportHistoricalData: ImportHistoricalData,
  IntegrationSettings: IntegrationSettings,
  LandingPage: LandingPage,
  MyNotificationSettings: MyNotificationSettings,
  MyQueue: MyQueue,
  MyVendorProfile: MyVendorProfile,
  NewCase: NewCase,
  NewVendor: NewVendor,
  NotificationSettings: NotificationSettings,
  QueueMonitor: QueueMonitor,
  Reports: Reports,
  RoleManagement: RoleManagement,
  ServiceProviders: ServiceProviders,
  Settings: Settings,
  UserGuide: UserGuide,
  UserManagement: UserManagement,
  VendorCallManagement: VendorCallManagement,
  VendorContracts: VendorContracts,
  VendorGuide: VendorGuide,
  VendorPortal: VendorPortal,
  VendorTracking: VendorTracking,
};

export const pagesConfig = {
  mainPage: 'Dashboard',
  Pages: PAGES,
  Layout: __Layout,
};
