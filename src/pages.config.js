import AdvancedExport from './pages/AdvancedExport';
import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import QueueMonitor from './pages/QueueMonitor';
import Calendar from './pages/Calendar';
import Customers from './pages/Customers';
import ServiceProviders from './pages/ServiceProviders';
import CallDetails from './pages/CallDetails';
import VendorTracking from './pages/VendorTracking';
import AuditLog from './pages/AuditLog';
import UserGuide from './pages/UserGuide';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdvancedExport": AdvancedExport,
    "Dashboard": Dashboard,
    "NewCase": NewCase,
    "QueueMonitor": QueueMonitor,
    "Calendar": Calendar,
    "Customers": Customers,
    "ServiceProviders": ServiceProviders,
    "CallDetails": CallDetails,
    "VendorTracking": VendorTracking,
    "AuditLog": AuditLog,
    "UserGuide": UserGuide,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};