import AllVendorsMap from './pages/AllVendorsMap';
import AutomationSettings from './pages/AutomationSettings';
import BotIntegration from './pages/BotIntegration';
import CallDetailsVendor from './pages/CallDetailsVendor';
import Calls from './pages/Calls';
import CaseDetails from './pages/CaseDetails';
import Cases from './pages/Cases';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import IntegrationSettings from './pages/IntegrationSettings';
import MyCallsVendor from './pages/MyCallsVendor';
import MyQueue from './pages/MyQueue';
import NewCase from './pages/NewCase';
import NotificationSettings from './pages/NotificationSettings';
import OperatorDashboard from './pages/OperatorDashboard';
import QueueMonitor from './pages/QueueMonitor';
import QueueSettings from './pages/QueueSettings';
import Reports from './pages/Reports';
import ServiceProviders from './pages/ServiceProviders';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import VendorMap from './pages/VendorMap';
import VendorPayments from './pages/VendorPayments';
import VendorPortal from './pages/VendorPortal';
import VendorProfile from './pages/VendorProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AllVendorsMap": AllVendorsMap,
    "AutomationSettings": AutomationSettings,
    "BotIntegration": BotIntegration,
    "CallDetailsVendor": CallDetailsVendor,
    "Calls": Calls,
    "CaseDetails": CaseDetails,
    "Cases": Cases,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "IntegrationSettings": IntegrationSettings,
    "MyCallsVendor": MyCallsVendor,
    "MyQueue": MyQueue,
    "NewCase": NewCase,
    "NotificationSettings": NotificationSettings,
    "OperatorDashboard": OperatorDashboard,
    "QueueMonitor": QueueMonitor,
    "QueueSettings": QueueSettings,
    "Reports": Reports,
    "ServiceProviders": ServiceProviders,
    "Settings": Settings,
    "UserManagement": UserManagement,
    "VendorMap": VendorMap,
    "VendorPayments": VendorPayments,
    "VendorPortal": VendorPortal,
    "VendorProfile": VendorProfile,
    "Login": Login,
    "Register": Register,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};