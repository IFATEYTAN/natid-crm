import NewCase from './pages/NewCase';
import Dashboard from './pages/Dashboard';
import QueueMonitor from './pages/QueueMonitor';


export const PAGES = {
    "NewCase": NewCase,
    "Dashboard": Dashboard,
    "QueueMonitor": QueueMonitor,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};