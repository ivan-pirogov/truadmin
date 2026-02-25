import React, { useState} from "react";
import { FiLogOut, FiUser, FiKey, FiShield } from "react-icons/fi";
import "./MainHeader.css";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from '../../services/api';
import ChangeOwnPasswordModal from '../UserModals/ChangeOwnPasswordModal';
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs";

const MainHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    await apiService.changeOwnPassword(oldPassword, newPassword);
  };

  // const handleMouseDown = (e: React.MouseEvent) => {
  //   setIsResizing(true);
  //   e.preventDefault();
  // };


   return (
        <div className="main-header">
          <Breadcrumbs />
          <div className="main-header-spacer"></div>
          <div className="main-header-user-info">
            <div className="main-header-user-details">
              <div className="main-header-user-name">
                <FiUser size={16} />
                <span>{user?.username}</span>
              </div>
              <div className={`main-header-user-role main-header-role-${user?.role}`}>
                {user?.role === 'admin' && <FiShield size={12} />}
                <span>{user?.role}</span>
              </div>
            </div>
            <button
              className="btn btn-gradient"
              onClick={() => setIsPasswordModalOpen(true)}
              title="Change Password"
            >
              <FiKey size={18} />
              <span>Change Password</span>
            </button>
            <button className="btn btn-gradient" onClick={handleLogout} title="Logout">
            {/* <button className="main-header-logout-button" onClick={handleLogout} title="Logout"> */}
              <FiLogOut size={18} />
              <span>Logout</span>
            </button>
          </div>

          <ChangeOwnPasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onSubmit={handleChangePassword}        
          />
        </div>

        
      );
}
export default MainHeader;