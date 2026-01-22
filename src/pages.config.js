import NewCase from './pages/NewCase';
import QueueMonitor from './pages/QueueMonitor';
import Dashboard from './pages/Dashboard';
import AdvancedExport from './pages/AdvancedExport';


export const PAGES = {
    "NewCase": NewCase,
    "QueueMonitor": QueueMonitor,
    "Dashboard": Dashboard,
    "AdvancedExport": AdvancedExport,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};