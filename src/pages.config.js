import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Customers from './pages/Customers';
import ServiceProviders from './pages/ServiceProviders';
import NewCase from './pages/NewCase';
import CaseDetails from './pages/CaseDetails';
import Settings from './pages/Settings';
import Calls from './pages/Calls';
import VendorPortal from './pages/VendorPortal';
import MyCallsVendor from './pages/MyCallsVendor';
import CallDetailsVendor from './pages/CallDetailsVendor';
import VendorPayments from './pages/VendorPayments';
import VendorMap from './pages/VendorMap';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Cases": Cases,
    "Customers": Customers,
    "ServiceProviders": ServiceProviders,
    "NewCase": NewCase,
    "CaseDetails": CaseDetails,
    "Settings": Settings,
    "Calls": Calls,
    "VendorPortal": VendorPortal,
    "MyCallsVendor": MyCallsVendor,
    "CallDetailsVendor": CallDetailsVendor,
    "VendorPayments": VendorPayments,
    "VendorMap": VendorMap,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};