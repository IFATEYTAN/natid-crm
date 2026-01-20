// Features imports
import Dashboard from './features/dashboard';
import Calls from './features/calls';
import CallDetailsVendor from './features/calls/CallDetailsVendor';
import NewCase from './features/calls/NewCase';
import Cases from './features/cases';
import CaseDetails from './features/cases/CaseDetails';
import ServiceProviders from './features/vendors';
import VendorProfile from './features/vendors/VendorProfile';
import VendorPortal from './features/vendors/VendorPortal';
import VendorPayments from './features/vendors/VendorPayments';
import VendorMap from './features/vendors/VendorMap';
import AllVendorsMap from './features/vendors/AllVendorsMap';
import MyVendorProfile from './features/vendors/MyVendorProfile';
import MyCallsVendor from './features/vendors/MyCallsVendor';
import CoverageAreas from './features/vendors/CoverageAreas';
import MyQueue from './features/queue';
import QueueMonitor from './features/queue/QueueMonitor';
import QueueSettings from './features/queue/QueueSettings';
import Settings from './features/settings';
import AutomationSettings from './features/settings/AutomationSettings';
import NotificationSettings from './features/settings/NotificationSettings';
import IntegrationSettings from './features/settings/IntegrationSettings';
import BotIntegration from './features/settings/BotIntegration';
import Reports from './features/reports';
import Customers from './features/customers';
import CustomerDetails from './features/customers/CustomerDetails';
import Agents from './features/agents';
import UserManagement from './features/agents/UserManagement';
import OperatorDashboard from './features/operators';
import Login from './features/auth/Login';
import AuthLogin from './features/auth/AuthLogin';
import Register from './features/auth/Register';

// Layout
import __Layout from './components/layout/Layout.jsx';


export const PAGES = {
    "Agents": Agents,
    "AllVendorsMap": AllVendorsMap,
    "AuthLogin": AuthLogin,
    "AutomationSettings": AutomationSettings,
    "BotIntegration": BotIntegration,
    "CallDetailsVendor": CallDetailsVendor,
    "Calls": Calls,
    "CaseDetails": CaseDetails,
    "Cases": Cases,
    "CoverageAreas": CoverageAreas,
    "CustomerDetails": CustomerDetails,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "IntegrationSettings": IntegrationSettings,
    "Login": Login,
    "MyCallsVendor": MyCallsVendor,
    "MyQueue": MyQueue,
    "MyVendorProfile": MyVendorProfile,
    "NewCase": NewCase,
    "NotificationSettings": NotificationSettings,
    "OperatorDashboard": OperatorDashboard,
    "QueueMonitor": QueueMonitor,
    "QueueSettings": QueueSettings,
    "Register": Register,
    "Reports": Reports,
    "ServiceProviders": ServiceProviders,
    "Settings": Settings,
    "UserManagement": UserManagement,
    "VendorMap": VendorMap,
    "VendorPayments": VendorPayments,
    "VendorPortal": VendorPortal,
    "VendorProfile": VendorProfile,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
