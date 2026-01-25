import AdvancedExport from './pages/AdvancedExport';
import Agents from './pages/Agents';
import AllVendorsMap from './pages/AllVendorsMap';
import AuditLog from './pages/AuditLog';
import AutomationSettings from './pages/AutomationSettings';
import Calendar from './pages/Calendar';
import CallDetails from './pages/CallDetails';
import CoverageAreas from './pages/CoverageAreas';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import IntegrationSettings from './pages/IntegrationSettings';
import MyVendorProfile from './pages/MyVendorProfile';
import NewCase from './pages/NewCase';
import NewVendor from './pages/NewVendor';
import NotificationSettings from './pages/NotificationSettings';
import QueueMonitor from './pages/QueueMonitor';
import Reports from './pages/Reports';
import ServiceProviders from './pages/ServiceProviders';
import Settings from './pages/Settings';
import UserGuide from './pages/UserGuide';
import UserManagement from './pages/UserManagement';
import VendorCallManagement from './pages/VendorCallManagement';
import VendorPortal from './pages/VendorPortal';
import VendorTracking from './pages/VendorTracking';
import VendorContracts from './pages/VendorContracts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdvancedExport": AdvancedExport,
    "Agents": Agents,
    "AllVendorsMap": AllVendorsMap,
    "AuditLog": AuditLog,
    "AutomationSettings": AutomationSettings,
    "Calendar": Calendar,
    "CallDetails": CallDetails,
    "CoverageAreas": CoverageAreas,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "IntegrationSettings": IntegrationSettings,
    "MyVendorProfile": MyVendorProfile,
    "NewCase": NewCase,
    "NewVendor": NewVendor,
    "NotificationSettings": NotificationSettings,
    "QueueMonitor": QueueMonitor,
    "Reports": Reports,
    "ServiceProviders": ServiceProviders,
    "Settings": Settings,
    "UserGuide": UserGuide,
    "UserManagement": UserManagement,
    "VendorCallManagement": VendorCallManagement,
    "VendorPortal": VendorPortal,
    "VendorTracking": VendorTracking,
    "VendorContracts": VendorContracts,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};