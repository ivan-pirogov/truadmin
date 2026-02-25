import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiEye, FiEyeOff, FiAlertCircle, FiDatabase } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, DatabaseStatus } from '../../services/api';

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const LoginCard = styled.div`
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
`;

const Logo = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  text-align: center;
  color: #666;
  margin-bottom: 30px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const PasswordInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PasswordInput = styled(Input)`
  padding-right: 45px;
  width: 100%;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 8px;
  padding: 6px;
  background: transparent;
  border: none;
  color: #718096;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #f7fafc;
    color: #2d3748;
  }

  &:focus {
    outline: none;
    background: #e2e8f0;
  }
`;

const Button = styled.button`
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 10px;
  border-radius: 5px;
  font-size: 14px;
`;

const DatabaseWarning = styled.div`
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
  padding: 15px;
  border-radius: 5px;
  font-size: 14px;
  margin-bottom: 20px;
`;

const WarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 10px;
`;

const WarningMessage = styled.div`
  margin-bottom: 10px;
  line-height: 1.5;
`;

const ConnectionInfo = styled.div`
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
  font-size: 12px;
  font-family: monospace;
`;

const ConnectionInfoRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ConnectionInfoLabel = styled.span`
  font-weight: 600;
  color: #495057;
  min-width: 80px;
`;

const ConnectionInfoValue = styled.span`
  color: #212529;
`;

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [checkingDb, setCheckingDb] = useState(true);

  const { login, isAuthenticated, requiresSetup, refreshSetupStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check database status on page load
    const checkDatabaseStatus = async () => {
      try {
        const status = await apiService.getDatabaseStatus();
        setDbStatus(status);
      } catch (err) {
        // If we can't check status, assume database is not connected
        setDbStatus({
          connected: false,
          message: 'Unable to check database status',
          error: 'Failed to connect to server',
        });
      } finally {
        setCheckingDb(false);
      }
    };

    checkDatabaseStatus();
    
    // Check setup status on page load (in case database was cleared)
    refreshSetupStatus();
  }, [refreshSetupStatus]);

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
    // If setup is required, redirect to setup
    else if (requiresSetup) {
      navigate('/setup', { replace: true });
    }
  }, [isAuthenticated, requiresSetup, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>TruAdmin</Logo>
        <Subtitle>Database Management Tool</Subtitle>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          {!checkingDb && dbStatus && !dbStatus.connected && (
            <DatabaseWarning>
              <WarningHeader>
                <FiAlertCircle size={18} />
                Нет подключения к базе данных
              </WarningHeader>
              <WarningMessage>
                {dbStatus.message}
                {dbStatus.error && (
                  <div style={{ marginTop: '8px', fontSize: '12px', fontStyle: 'italic' }}>
                    {dbStatus.error}
                  </div>
                )}
              </WarningMessage>
              {dbStatus.connection_info && (
                <ConnectionInfo>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#495057' }}>
                    <FiDatabase size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Информация о подключении:
                  </div>
                  <ConnectionInfoRow>
                    <ConnectionInfoLabel>Host:</ConnectionInfoLabel>
                    <ConnectionInfoValue>{dbStatus.connection_info.host}</ConnectionInfoValue>
                  </ConnectionInfoRow>
                  <ConnectionInfoRow>
                    <ConnectionInfoLabel>Port:</ConnectionInfoLabel>
                    <ConnectionInfoValue>{dbStatus.connection_info.port}</ConnectionInfoValue>
                  </ConnectionInfoRow>
                  <ConnectionInfoRow>
                    <ConnectionInfoLabel>Database:</ConnectionInfoLabel>
                    <ConnectionInfoValue>{dbStatus.connection_info.database}</ConnectionInfoValue>
                  </ConnectionInfoRow>
                  <ConnectionInfoRow>
                    <ConnectionInfoLabel>Username:</ConnectionInfoLabel>
                    <ConnectionInfoValue>{dbStatus.connection_info.username}</ConnectionInfoValue>
                  </ConnectionInfoRow>
                </ConnectionInfo>
              )}
            </DatabaseWarning>
          )}

          <FormGroup>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <PasswordInputWrapper>
              <PasswordInput
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </PasswordToggle>
            </PasswordInputWrapper>
          </FormGroup>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </Form>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
