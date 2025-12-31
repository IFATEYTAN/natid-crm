import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Customers from './pages/Customers';
import ServiceProviders from './pages/ServiceProviders';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Cases": Cases,
    "Customers": Customers,
    "ServiceProviders": ServiceProviders,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};