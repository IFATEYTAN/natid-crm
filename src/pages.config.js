import CallDetailsVendor from './pages/CallDetailsVendor';
import Calls from './pages/Calls';
import CaseDetails from './pages/CaseDetails';
import Cases from './pages/Cases';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import MyCallsVendor from './pages/MyCallsVendor';
import NewCase from './pages/NewCase';
import ServiceProviders from './pages/ServiceProviders';
import Settings from './pages/Settings';
import VendorMap from './pages/VendorMap';
import VendorPayments from './pages/VendorPayments';
import VendorPortal from './pages/VendorPortal';
import MyQueue from './pages/MyQueue';
import QueueSettings from './pages/QueueSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CallDetailsVendor": CallDetailsVendor,
    "Calls": Calls,
    "CaseDetails": CaseDetails,
    "Cases": Cases,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "MyCallsVendor": MyCallsVendor,
    "NewCase": NewCase,
    "ServiceProviders": ServiceProviders,
    "Settings": Settings,
    "VendorMap": VendorMap,
    "VendorPayments": VendorPayments,
    "VendorPortal": VendorPortal,
    "MyQueue": MyQueue,
    "QueueSettings": QueueSettings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};