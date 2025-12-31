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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};