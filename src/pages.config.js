import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import QueueMonitor from './pages/QueueMonitor';
import Calls from './pages/Calls';


export const PAGES = {
    "Dashboard": Dashboard,
    "NewCase": NewCase,
    "QueueMonitor": QueueMonitor,
    "Calls": Calls,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};