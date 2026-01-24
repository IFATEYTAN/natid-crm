import AdvancedExport from './pages/AdvancedExport';
import AuditLog from './pages/AuditLog';
import AutomationSettings from './pages/AutomationSettings';
import Calendar from './pages/Calendar';
import CallDetails from './pages/CallDetails';
import Customers from './pages/Customers';
import IntegrationSettings from './pages/IntegrationSettings';
import QueueMonitor from './pages/QueueMonitor';
import Reports from './pages/Reports';
import UserGuide from './pages/UserGuide';
import VendorTracking from './pages/VendorTracking';
import Dashboard from './pages/Dashboard';
import MyVendorProfile from './pages/MyVendorProfile';
import NewCase from './pages/NewCase';
import NewVendor from './pages/NewVendor';
import ServiceProviders from './pages/ServiceProviders';
import VendorPortal from './pages/VendorPortal';
import AllVendorsMap from './pages/AllVendorsMap';
import CoverageAreas from './pages/CoverageAreas';
import Agents from './pages/Agents';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdvancedExport": AdvancedExport,
    "AuditLog": AuditLog,
    "AutomationSettings": AutomationSettings,
    "Calendar": Calendar,
    "CallDetails": CallDetails,
    "Customers": Customers,
    "IntegrationSettings": IntegrationSettings,
    "QueueMonitor": QueueMonitor,
    "Reports": Reports,
    "UserGuide": UserGuide,
    "VendorTracking": VendorTracking,
    "Dashboard": Dashboard,
    "MyVendorProfile": MyVendorProfile,
    "NewCase": NewCase,
    "NewVendor": NewVendor,
    "ServiceProviders": ServiceProviders,
    "VendorPortal": VendorPortal,
    "AllVendorsMap": AllVendorsMap,
    "CoverageAreas": CoverageAreas,
    "Agents": Agents,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};