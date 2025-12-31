import BotIntegration from './pages/BotIntegration';
import CallDetailsVendor from './pages/CallDetailsVendor';
import Calls from './pages/Calls';
import CaseDetails from './pages/CaseDetails';
import Cases from './pages/Cases';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import MyCallsVendor from './pages/MyCallsVendor';
import MyQueue from './pages/MyQueue';
import NewCase from './pages/NewCase';
import QueueSettings from './pages/QueueSettings';
import ServiceProviders from './pages/ServiceProviders';
import Settings from './pages/Settings';
import VendorMap from './pages/VendorMap';
import VendorPayments from './pages/VendorPayments';
import VendorPortal from './pages/VendorPortal';
import QueueMonitor from './pages/QueueMonitor';
import Reports from './pages/Reports';
import AutomationSettings from './pages/AutomationSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BotIntegration": BotIntegration,
    "CallDetailsVendor": CallDetailsVendor,
    "Calls": Calls,
    "CaseDetails": CaseDetails,
    "Cases": Cases,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "MyCallsVendor": MyCallsVendor,
    "MyQueue": MyQueue,
    "NewCase": NewCase,
    "QueueSettings": QueueSettings,
    "ServiceProviders": ServiceProviders,
    "Settings": Settings,
    "VendorMap": VendorMap,
    "VendorPayments": VendorPayments,
    "VendorPortal": VendorPortal,
    "QueueMonitor": QueueMonitor,
    "Reports": Reports,
    "AutomationSettings": AutomationSettings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};