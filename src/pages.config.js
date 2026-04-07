/**
 * pages.config.js - Page routing configuration
 * 
 * All pages are lazy-loaded to keep the initial bundle small.
 * THE ONLY EDITABLE VALUE: mainPage
 */
import { lazyRetry } from '@/lib/lazyRetry';
import __Layout from './Layout.jsx';

const lazy = (importFn) => lazyRetry(importFn);

export const PAGES = {
    "AdminDataCleanup": lazy(() => import('./pages/AdminDataCleanup')),
    "AdminDisplaySettings": lazy(() => import('./pages/AdminDisplaySettings')),
    "AdvancedExport": lazy(() => import('./pages/AdvancedExport')),
    "Agents": lazy(() => import('./pages/Agents')),
    "AllVendorsMap": lazy(() => import('./pages/AllVendorsMap')),
    "AuditLog": lazy(() => import('./pages/AuditLog')),
    "AutomationSettings": lazy(() => import('./pages/AutomationSettings')),
    "Calendar": lazy(() => import('./pages/Calendar')),
    "CallDetails": lazy(() => import('./pages/CallDetails')),
    "Calls": lazy(() => import('./pages/Calls')),
    "CTISettings": lazy(() => import('./pages/CTISettings')),
    "CoverageAreas": lazy(() => import('./pages/CoverageAreas')),
    "CustomerDetails": lazy(() => import('./pages/CustomerDetails')),
    "CustomerFeedback": lazy(() => import('./pages/CustomerFeedback')),
    "Customers": lazy(() => import('./pages/Customers')),
    "Dashboard": lazy(() => import('./pages/Dashboard')),
    "DepartmentView": lazy(() => import('./pages/DepartmentView')),
    "EditCustomer": lazy(() => import('./pages/EditCustomer')),
    "EditVendor": lazy(() => import('./pages/EditVendor')),
    "FeedbackManagement": lazy(() => import('./pages/FeedbackManagement')),
    "FleetManagement": lazy(() => import('./pages/FleetManagement')),
    "FormView": lazy(() => import('./pages/FormView')),
    "HistoricalDataAnalysis": lazy(() => import('./pages/HistoricalDataAnalysis')),
    "ImportHistoricalData": lazy(() => import('./pages/ImportHistoricalData')),
    "IntegrationSettings": lazy(() => import('./pages/IntegrationSettings')),
    "Invoices": lazy(() => import('./pages/Invoices')),
    "KnowledgeBase": lazy(() => import('./pages/KnowledgeBase')),
    "CallScripts": lazy(() => import('./pages/CallScripts')),
    "CustomerPortal": lazy(() => import('./pages/CustomerPortal')),
    "KPIManagement": lazy(() => import('./pages/KPIManagement')),
    "LandingPage": lazy(() => import('./pages/LandingPage')),
    "MyNotificationSettings": lazy(() => import('./pages/MyNotificationSettings')),
    "MyQueue": lazy(() => import('./pages/MyQueue')),
    "MyVendorProfile": lazy(() => import('./pages/MyVendorProfile')),
    "NewCase": lazy(() => import('./pages/NewCase')),
    "NewVendor": lazy(() => import('./pages/NewVendor')),
    "NotificationSettings": lazy(() => import('./pages/NotificationSettings')),
    "PrivateService": lazy(() => import('./pages/PrivateService')),
    "ProductCatalog": lazy(() => import('./pages/ProductCatalog')),
    "QueueMonitor": lazy(() => import('./pages/QueueMonitor')),
    "Reminders": lazy(() => import('./pages/Reminders')),
    "Reports": lazy(() => import('./pages/Reports')),
    "RoleManagement": lazy(() => import('./pages/RoleManagement')),
    "ServiceProviders": lazy(() => import('./pages/ServiceProviders')),
    "Settings": lazy(() => import('./pages/Settings')),
    "SpecialCaseForm": lazy(() => import('./pages/SpecialCaseForm')),
    "UserGuide": lazy(() => import('./pages/UserGuide')),
    "UserManagement": lazy(() => import('./pages/UserManagement')),
    "UserProfile": lazy(() => import('./pages/UserProfile')),
    "VendorCallManagement": lazy(() => import('./pages/VendorCallManagement')),
    "VendorContracts": lazy(() => import('./pages/VendorContracts')),
    "VendorDetails": lazy(() => import('./pages/VendorDetails')),
    "VendorGuide": lazy(() => import('./pages/VendorGuide')),
    "VendorMobileApp": lazy(() => import('./pages/VendorPortal')),
    "VendorPortal": lazy(() => import('./pages/VendorPortal')),
    "VendorTracking": lazy(() => import('./pages/VendorTracking')),
    "VendorOnboarding": lazy(() => import('./pages/VendorOnboarding')),
    "InsuranceAgentPackages": lazy(() => import('./pages/InsuranceAgentPackages')),
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};