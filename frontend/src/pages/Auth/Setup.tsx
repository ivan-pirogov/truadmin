import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const SetupContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const SetupCard = styled.div`
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
`;

const Logo = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 10px;
`;

const Title = styled.h2`
  text-align: center;
  color: #333;
  margin-bottom: 10px;
`;

const Description = styled.p`
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  line-height: 1.6;
`;

const WelcomeBox = styled.div`
  background: #f0f4ff;
  border-left: 4px solid #667eea;
  padding: 15px;
  margin-bottom: 25px;
  border-radius: 4px;
`;

const WelcomeText = styled.p`
  color: #333;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
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

const PasswordHint = styled.small`
  color: #666;
  font-size: 12px;
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

const SuccessMessage = styled.div`
  background: #efe;
  border: 1px solid #cfc;
  color: #3c3;
  padding: 10px;
  border-radius: 5px;
  font-size: 14px;
`;

const Setup: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { isAuthenticated, requiresSetup, refreshSetupStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
    // If setup is not required, redirect to login
    else if (!requiresSetup) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, requiresSetup, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(`${API_URL}/api/v1/auth/setup`, { password });
      setSuccess(true);

      // Refresh setup status in AuthContext
      await refreshSetupStatus();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SetupContainer>
        <SetupCard>
          <Logo>TruAdmin</Logo>
          <Title>Setup Complete!</Title>
          <SuccessMessage>
            Admin account created successfully. Redirecting to login...
          </SuccessMessage>
        </SetupCard>
      </SetupContainer>
    );
  }

  return (
    <SetupContainer>
      <SetupCard>
        <Logo>TruAdmin</Logo>
        <Title>Initial Setup</Title>
        <Description>
          Welcome to TruAdmin! Let's set up your admin account.
        </Description>

        <WelcomeBox>
          <WelcomeText>
            <strong>First Time Setup:</strong><br />
            Create a password for the default "admin" user. This account will have full administrative privileges.
          </WelcomeText>
        </WelcomeBox>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <FormGroup>
            <Label htmlFor="password">Admin Password</Label>
            <PasswordInputWrapper>
              <PasswordInput
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                autoFocus
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </PasswordToggle>
            </PasswordInputWrapper>
            <PasswordHint>Minimum 6 characters</PasswordHint>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInputWrapper>
              <PasswordInput
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </PasswordToggle>
            </PasswordInputWrapper>
          </FormGroup>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating Admin Account...' : 'Complete Setup'}
          </Button>
        </Form>
      </SetupCard>
    </SetupContainer>
  );
};

export default Setup;
