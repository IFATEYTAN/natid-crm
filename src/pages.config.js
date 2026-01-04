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
import Login from './pages/Login';
import MyCallsVendor from './pages/MyCallsVendor';
import MyQueue from './pages/MyQueue';
import NewCase from './pages/NewCase';
import NotificationSettings from './pages/NotificationSettings';
import OperatorDashboard from './pages/OperatorDashboard';
import QueueMonitor from './pages/QueueMonitor';
import QueueSettings from './pages/QueueSettings';
import Register from './pages/Register';
import Reports from './pages/Reports';
import ServiceProviders from './pages/ServiceProviders';
import Settings from './pages/Settings';
import SignIn from './pages/SignIn';
import UserManagement from './pages/UserManagement';
import VendorMap from './pages/VendorMap';
import VendorPayments from './pages/VendorPayments';
import VendorPortal from './pages/VendorPortal';
import VendorProfile from './pages/VendorProfile';
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
    "Login": Login,
    "MyCallsVendor": MyCallsVendor,
    "MyQueue": MyQueue,
    "NewCase": NewCase,
    "NotificationSettings": NotificationSettings,
    "OperatorDashboard": OperatorDashboard,
    "QueueMonitor": QueueMonitor,
    "QueueSettings": QueueSettings,
    "Register": Register,
    "Reports": Reports,
    "ServiceProviders": ServiceProviders,
    "Settings": Settings,
    "SignIn": SignIn,
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