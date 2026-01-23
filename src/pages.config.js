import AdvancedExport from './pages/AdvancedExport';
import AuditLog from './pages/AuditLog';
import AutomationSettings from './pages/AutomationSettings';
import Calendar from './pages/Calendar';
import CallDetails from './pages/CallDetails';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import IntegrationSettings from './pages/IntegrationSettings';
import MyVendorProfile from './pages/MyVendorProfile';
import NewCase from './pages/NewCase';
import NewVendor from './pages/NewVendor';
import QueueMonitor from './pages/QueueMonitor';
import Reports from './pages/Reports';
import ServiceProviders from './pages/ServiceProviders';
import UserGuide from './pages/UserGuide';
import VendorPortal from './pages/VendorPortal';
import VendorTracking from './pages/VendorTracking';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdvancedExport": AdvancedExport,
    "AuditLog": AuditLog,
    "AutomationSettings": AutomationSettings,
    "Calendar": Calendar,
    "CallDetails": CallDetails,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "IntegrationSettings": IntegrationSettings,
    "MyVendorProfile": MyVendorProfile,
    "NewCase": NewCase,
    "NewVendor": NewVendor,
    "QueueMonitor": QueueMonitor,
    "Reports": Reports,
    "ServiceProviders": ServiceProviders,
    "UserGuide": UserGuide,
    "VendorPortal": VendorPortal,
    "VendorTracking": VendorTracking,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};