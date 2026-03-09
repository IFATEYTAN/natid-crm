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
import AdminDataCleanup from './pages/AdminDataCleanup';
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
import EditCustomer from './pages/EditCustomer';
import EditVendor from './pages/EditVendor';
import FeedbackManagement from './pages/FeedbackManagement';
import FleetManagement from './pages/FleetManagement';
import FormView from './pages/FormView';
import HistoricalDataAnalysis from './pages/HistoricalDataAnalysis';
import ImportHistoricalData from './pages/ImportHistoricalData';
import IntegrationSettings from './pages/IntegrationSettings';
import Invoices from './pages/Invoices';
import LandingPage from './pages/LandingPage';
import MyNotificationSettings from './pages/MyNotificationSettings';
import MyQueue from './pages/MyQueue';
import MyVendorProfile from './pages/MyVendorProfile';
import NewCase from './pages/NewCase';
import NewVendor from './pages/NewVendor';
import NotificationSettings from './pages/NotificationSettings';
import OperationalRates from './pages/OperationalRates';
import ProductCatalog from './pages/ProductCatalog';
import QueueMonitor from './pages/QueueMonitor';
import Reminders from './pages/Reminders';
import Reports from './pages/Reports';
import RoleManagement from './pages/RoleManagement';
import ServiceProviders from './pages/ServiceProviders';
import Settings from './pages/Settings';
import UserGuide from './pages/UserGuide';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import VendorCallManagement from './pages/VendorCallManagement';
import VendorContracts from './pages/VendorContracts';
import VendorDetails from './pages/VendorDetails';
import VendorGuide from './pages/VendorGuide';
import VendorPortal from './pages/VendorPortal';
import VendorTracking from './pages/VendorTracking';
import __Layout from './Layout.jsx';

export const PAGES = {
  AdminDataCleanup: AdminDataCleanup,
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
  EditCustomer: EditCustomer,
  EditVendor: EditVendor,
  FeedbackManagement: FeedbackManagement,
  FleetManagement: FleetManagement,
  FormView: FormView,
  HistoricalDataAnalysis: HistoricalDataAnalysis,
  ImportHistoricalData: ImportHistoricalData,
  IntegrationSettings: IntegrationSettings,
  Invoices: Invoices,
  LandingPage: LandingPage,
  MyNotificationSettings: MyNotificationSettings,
  MyQueue: MyQueue,
  MyVendorProfile: MyVendorProfile,
  NewCase: NewCase,
  NewVendor: NewVendor,
  NotificationSettings: NotificationSettings,
  OperationalRates: OperationalRates,
  ProductCatalog: ProductCatalog,
  QueueMonitor: QueueMonitor,
  Reminders: Reminders,
  Reports: Reports,
  RoleManagement: RoleManagement,
  ServiceProviders: ServiceProviders,
  Settings: Settings,
  UserGuide: UserGuide,
  UserManagement: UserManagement,
  UserProfile: UserProfile,
  VendorCallManagement: VendorCallManagement,
  VendorContracts: VendorContracts,
  VendorDetails: VendorDetails,
  VendorGuide: VendorGuide,
  VendorPortal: VendorPortal,
  VendorTracking: VendorTracking,
};

export const pagesConfig = {
  mainPage: 'Dashboard',
  Pages: PAGES,
  Layout: __Layout,
};
