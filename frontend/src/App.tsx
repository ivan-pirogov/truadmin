import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RoleProvider } from './contexts/RoleContext';
import { TabProvider } from './contexts/TabContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Auth/Login';
import Setup from './pages/Auth/Setup';
import Main from './pages/Main/Main';
import ModalDemo from './components/CustomModals/ModalDemo';
import './styles/App.css';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <RoleProvider>
          <TabProvider>
            <div className="App">
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/modals-demo" element={<ModalDemo />} />

            {/* Protected routes */}
            <Route path="/" element={<PrivateRoute><Main /></PrivateRoute>} />
            </Routes>
            </div>
          </TabProvider>
        </RoleProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
