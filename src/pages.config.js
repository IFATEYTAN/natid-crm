import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Customers from './pages/Customers';
import ServiceProviders from './pages/ServiceProviders';
import NewCase from './pages/NewCase';
import CaseDetails from './pages/CaseDetails';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Cases": Cases,
    "Customers": Customers,
    "ServiceProviders": ServiceProviders,
    "NewCase": NewCase,
    "CaseDetails": CaseDetails,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};