import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiUser, FiShield, FiLock, FiUnlock, FiKey } from 'react-icons/fi';
import TabLayout from '../TabLayout/TabLayout';
import { apiService, User } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CreateUserModal from '../UserModals/CreateUserModal';
import ChangePasswordModal from '../UserModals/ChangePasswordModal';
import './UsersTab.css';

const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser } = useAuth();

  // Password change modal state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUsername, setSelectedUsername] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getUsers();
      setUsers(data || []);
      setError('');
    } catch (err: any) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateUserSubmit = async (
    username: string,
    password: string,
    role: 'admin' | 'user'
  ) => {
    await apiService.createUser(username, password, role);
    await loadUsers();
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (currentUser?.id === userId) {
      alert('You cannot delete yourself');
      return;
    }

    if (username === 'admin') {
      alert('The default admin user cannot be deleted');
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        await apiService.deleteUser(userId);
        await loadUsers();
      } catch (err: any) {
        alert('Failed to delete user: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleOpenPasswordModal = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
  };

  const handleChangePasswordSubmit = async (newPassword: string) => {
    await apiService.changeUserPassword(selectedUserId, newPassword);
  };

  const handleToggleBlock = async (userId: string, username: string, isBlocked: boolean) => {
    if (currentUser?.id === userId) {
      alert('You cannot block yourself');
      return;
    }

    if (username === 'admin') {
      alert('The default admin user cannot be blocked');
      return;
    }

    const action = isBlocked ? 'unblock' : 'block';
    if (window.confirm(`Are you sure you want to ${action} user "${username}"?`)) {
      try {
        await apiService.toggleBlockUser(userId, !isBlocked);
        await loadUsers();
      } catch (err: any) {
        alert(`Failed to ${action} user: ` + (err.message || 'Unknown error'));
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <TabLayout>
        <div className="loading-container">Loading users...</div>
      </TabLayout>
    );
  }

  if (error) {
    return (
      <TabLayout>
        <div className="error-banner">{error}</div>
      </TabLayout>
    );
  }

  // Header content
  const headerContent = (
    <div className="users-header">
      <div className="connections-title-wrapper">
        <FiShield size={28} className="connections-title-icon" />
        <h1 className="connections-title">Users</h1>
      </div>
      <button className="btn btn-primary" onClick={handleCreateUser}>
        <FiPlus size={18} />
        Create User
      </button>
    </div>
  );

  // Footer content
  const footerContent = users.length > 0 && (
    <div className="connections-footer">
      <span className="connections-count">
        {users.length} {users.length === 1 ? 'user' : 'users'}
      </span>
    </div>
  );

  return (
    <TabLayout header={headerContent} footer={footerContent}>
      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FiShield size={64} />
          </div>
          <p className="empty-title">No users yet</p>
          <p className="empty-description">Create your first user to get started</p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={user.is_blocked ? 'blocked-row' : ''}>
                  <td>
                    <div className="user-cell">
                      <FiUser size={16} />
                      <span>{user.username}</span>
                      {currentUser?.id === user.id && <span className="badge-you">You</span>}
                    </div>
                  </td>
                  <td>
                    <div className={`role-badge role-${user.role}`}>
                      {user.role === 'admin' && <FiShield size={14} />}
                      {user.role}
                    </div>
                  </td>
                  <td>
                    {user.is_blocked ? (
                      <span className="status-blocked">
                        <FiLock size={14} /> Blocked
                      </span>
                    ) : (
                      <span className="status-active">
                        <FiUnlock size={14} /> Active
                      </span>
                    )}
                  </td>
                  <td className="date-cell">{formatDate(user.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-icon"
                        onClick={() => handleOpenPasswordModal(user.id, user.username)}
                        title="Change password"
                      >
                        <FiKey size={16} />
                      </button>
                      <button
                        className={
                          user.is_blocked ? 'btn btn-icon btn-unblock' : 'btn btn-icon btn-block'
                        }
                        onClick={() => handleToggleBlock(user.id, user.username, user.is_blocked)}
                        disabled={currentUser?.id === user.id || user.username === 'admin'}
                        title={
                          user.username === 'admin'
                            ? 'Cannot block default admin'
                            : user.is_blocked
                              ? 'Unblock user'
                              : 'Block user'
                        }
                      >
                        {user.is_blocked ? <FiUnlock size={16} /> : <FiLock size={16} />}
                      </button>
                      <button
                        className="btn btn-icon btn-outline-danger"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        disabled={currentUser?.id === user.id || user.username === 'admin'}
                        title={
                          user.username === 'admin'
                            ? 'Cannot delete default admin'
                            : currentUser?.id === user.id
                              ? 'Cannot delete yourself'
                              : 'Delete user'
                        }
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUserSubmit}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handleClosePasswordModal}
        username={selectedUsername}
        onSubmit={handleChangePasswordSubmit}
      />
    </TabLayout>
  );
};

export default UsersTab;
