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
import QueueMonitor from './pages/QueueMonitor';
import QueueSettings from './pages/QueueSettings';
import Reports from './pages/Reports';
import ServiceProviders from './pages/ServiceProviders';
import Settings from './pages/Settings';
import VendorMap from './pages/VendorMap';
import VendorPayments from './pages/VendorPayments';
import VendorPortal from './pages/VendorPortal';
import VendorProfile from './pages/VendorProfile';
import __Layout from './Layout.jsx';


export const PAGES = {
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
    "QueueMonitor": QueueMonitor,
    "QueueSettings": QueueSettings,
    "Reports": Reports,
    "ServiceProviders": ServiceProviders,
    "Settings": Settings,
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