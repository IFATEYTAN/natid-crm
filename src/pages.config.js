import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import QueueMonitor from './pages/QueueMonitor';


export const PAGES = {
    "Dashboard": Dashboard,
    "NewCase": NewCase,
    "QueueMonitor": QueueMonitor,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};