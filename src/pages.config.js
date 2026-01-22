import AdvancedExport from './pages/AdvancedExport';
import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import QueueMonitor from './pages/QueueMonitor';
import Calendar from './pages/Calendar';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdvancedExport": AdvancedExport,
    "Dashboard": Dashboard,
    "NewCase": NewCase,
    "QueueMonitor": QueueMonitor,
    "Calendar": Calendar,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};