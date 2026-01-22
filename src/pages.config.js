import AdvancedExport from './pages/AdvancedExport';
import AuditLog from './pages/AuditLog';
import Calendar from './pages/Calendar';
import CallDetails from './pages/CallDetails';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import QueueMonitor from './pages/QueueMonitor';
import ServiceProviders from './pages/ServiceProviders';
import UserGuide from './pages/UserGuide';
import VendorTracking from './pages/VendorTracking';
import AutomationSettings from './pages/AutomationSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdvancedExport": AdvancedExport,
    "AuditLog": AuditLog,
    "Calendar": Calendar,
    "CallDetails": CallDetails,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "NewCase": NewCase,
    "QueueMonitor": QueueMonitor,
    "ServiceProviders": ServiceProviders,
    "UserGuide": UserGuide,
    "VendorTracking": VendorTracking,
    "AutomationSettings": AutomationSettings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};