import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AdminClientPilotagePage from './pages/AdminClientPilotagePage';
import CompanyTypeSelectionPage from './pages/CompanyTypeSelectionPage';
import SimpleCompanyFormPage from './pages/SimpleCompanyFormPage';
import ComplexCompanyFormPage from './pages/ComplexCompanyFormPage';
import ProcessCreationPage from './pages/ProcessCreationPage';
import ContributorPilotagePage from './pages/ContributorPilotagePage';
import ValidatorPilotagePage from './pages/ValidatorPilotagePage';
import UserProfilePage from './pages/UserProfilePage';
import SiteProcessesPage from './pages/SiteProcessesPage';
import UserManagementPage from './pages/UserManagementPage';
import ReportsPage from './pages/ReportsPage';
import GestionPage from './pages/GestionPage';
import ProcessIndicatorsPage from './pages/ProcessIndicatorsPage';
import DonneesProgrammationPage from './pages/gestion/DonneesProgrammationPage';
import ContextePage from './pages/gestion/ContextePage';
import EnjeuxInternesExternesPage from './pages/gestion/EnjeuxInternesExternesPage';
import EnjeuxEnergetiquesPage from './pages/gestion/EnjeuxEnergetiquesPage';
import SERObjectifsPage from './pages/gestion/SERObjectifsPage';
import SecteurEnergiePage from './pages/gestion/SecteurEnergiePage';
import EnjeuxCriteresPage from './pages/gestion/EnjeuxCriteresPage';
import UsersManagementPage from './pages/gestion/UsersManagementPage';
import LeadershipPage from './pages/gestion/LeadershipPage';
import PolitiqueObjectifsPage from './pages/gestion/PolitiqueObjectifsPage';
import OrganisationResponsabilitesPage from './pages/gestion/OrganisationResponsabilitesPage';
import PlanificationsRessourcesPage from './pages/gestion/PlanificationsRessourcesPage';
import SystemePage from './pages/gestion/SystemePage';
import AmeliorationPage from './pages/gestion/AmeliorationPage';
import ProcessusSystemeDocumentairePage from './pages/gestion/ProcessusSystemeDocumentairePage';
import PartiesInteresseesPage from './pages/gestion/PartiesInteresseesPage';
import PerimetreDomainePage from './pages/gestion/PerimetreDomainePage';
import UESPage from './pages/gestion/UESPage';
import ConceptionModificationsPage from './pages/gestion/ConceptionModificationsPage';
import InfrastructuresPage from './pages/gestion/InfrastructuresPage';
import AuditsPage from './pages/gestion/AuditsPage';
import NcAmeliorationPage from './pages/gestion/NcAmeliorationPage';
import RevueManagementPage from './pages/gestion/RevueManagementPage';
import DemandeEnergetiquePage from './pages/gestion/DemandeEnergetiquePage';
import RevueDonneesPage from './pages/gestion/RevueDonneesPage';
import DonneesEnergetiquesPage from './pages/gestion/DonneesEnergetiquesPage';

// Operation Pages
import SectorPage from './pages/operations/SectorPage';
import EnergyTypePage from './pages/operations/EnergyTypePage';
import StandardsPage from './pages/operations/StandardsPage';
import IssuesPage from './pages/operations/IssuesPage';
import CriteriaPage from './pages/operations/CriteriaPage';
import IndicatorsPage from './pages/operations/IndicatorsPage';
import CompanyManagementPage from './pages/CompanyManagementPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import CollectionManagementPage from './pages/CollectionManagementPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requiredRole="guest">
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/GestionPage" 
            element={
              <ProtectedRoute requiredRole="guest">
                <GestionPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/programmation" 
            element={
              <ProtectedRoute requiredRole="guest">
                <DonneesProgrammationPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/contexte" 
            element={
              <ProtectedRoute requiredRole="guest">
                <ContextePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/contexte/enjeux-internes-externes" 
            element={
              <ProtectedRoute requiredRole="guest">
                <EnjeuxInternesExternesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/contexte/parties-interessees" 
            element={
              <ProtectedRoute requiredRole="guest">
                <PartiesInteresseesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/contexte/perimetre-domaine" 
            element={
              <ProtectedRoute requiredRole="guest">
                <PerimetreDomainePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/contexte/enjeux-energetiques" 
            element={
              <ProtectedRoute requiredRole="guest">
                <EnjeuxEnergetiquesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/contexte/ser-objectifs-cibles" 
            element={
              <ProtectedRoute requiredRole="guest">
                <SERObjectifsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/leadership" 
            element={
              <ProtectedRoute requiredRole="guest">
                <LeadershipPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/leadership/politique" 
            element={
              <ProtectedRoute requiredRole="guest">
                <PolitiqueObjectifsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/leadership/organisation" 
            element={
              <ProtectedRoute requiredRole="guest">
                <OrganisationResponsabilitesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/leadership/planification" 
            element={
              <ProtectedRoute requiredRole="guest">
                <PlanificationsRessourcesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/systeme" 
            element={
              <ProtectedRoute requiredRole="guest">
                <SystemePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/systeme/processus" 
            element={
              <ProtectedRoute requiredRole="guest">
                <ProcessusSystemeDocumentairePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/systeme/ues" 
            element={
              <ProtectedRoute requiredRole="guest">
                <UESPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/systeme/demande" 
            element={
              <ProtectedRoute requiredRole="guest">
                <DemandeEnergetiquePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/systeme/donnees" 
            element={
              <ProtectedRoute requiredRole="guest">
                <DonneesEnergetiquesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/systeme/conception" 
            element={
              <ProtectedRoute requiredRole="guest">
                <ConceptionModificationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/systeme/infrastructures" 
            element={
              <ProtectedRoute requiredRole="guest">
                <InfrastructuresPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/systeme/revue" 
            element={
              <ProtectedRoute requiredRole="guest">
                <RevueDonneesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/amelioration" 
            element={
              <ProtectedRoute requiredRole="guest">
                <AmeliorationPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/amelioration/audits" 
            element={
              <ProtectedRoute requiredRole="guest">
                <AuditsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/amelioration/nc" 
            element={
              <ProtectedRoute requiredRole="guest">
                <NcAmeliorationPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/amelioration/revue" 
            element={
              <ProtectedRoute requiredRole="guest">
                <RevueManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/secteur-energie" 
            element={
              <ProtectedRoute requiredRole="guest">
                <SecteurEnergiePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/enjeux-criteres" 
            element={
              <ProtectedRoute requiredRole="guest">
                <EnjeuxCriteresPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gestion/users-management" 
            element={
              <ProtectedRoute requiredRole="guest">
                <UsersManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/pilotage" 
            element={
              <ProtectedRoute requiredRole="guest">
                <ContributorPilotagePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-client-pilotage" 
            element={
              <ProtectedRoute requiredRole="admin_client">
                <AdminClientPilotagePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/site/:siteName" 
            element={
              <ProtectedRoute requiredRole="guest">
                <SiteProcessesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/site/:siteName/process/:processCode" 
            element={
              <ProtectedRoute requiredRole="guest">
                <ProcessIndicatorsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/validation" 
            element={
              <ProtectedRoute requiredRole="validateur">
                <ValidatorPilotagePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute requiredRole="guest">
                <ReportsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/company-management" 
            element={
              <ProtectedRoute requiredRole="admin">
                <CompanyManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/company-detail/:companyName" 
            element={
              <ProtectedRoute requiredRole="admin">
                <CompanyDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user-management" 
            element={
              <ProtectedRoute requiredRole="admin">
                <UserManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user-profiles" 
            element={
              <ProtectedRoute requiredRole="admin">
                <UserProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/company-type-selection" 
            element={
              <ProtectedRoute requiredRole="admin">
                <CompanyTypeSelectionPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/simple-company-form" 
            element={
              <ProtectedRoute requiredRole="admin">
                <SimpleCompanyFormPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/complex-company-form" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ComplexCompanyFormPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/process-creation" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ProcessCreationPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Operation Routes */}
          <Route 
            path="/operations/sectors" 
            element={
              <ProtectedRoute requiredRole="admin">
                <SectorPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/operations/energy-types" 
            element={
              <ProtectedRoute requiredRole="admin">
                <EnergyTypePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/operations/standards" 
            element={
              <ProtectedRoute requiredRole="admin">
                <StandardsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/operations/issues" 
            element={
              <ProtectedRoute requiredRole="admin">
                <IssuesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/operations/criteria" 
            element={
              <ProtectedRoute requiredRole="admin">
                <CriteriaPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/operations/indicators" 
            element={
              <ProtectedRoute requiredRole="admin">
                <IndicatorsPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;