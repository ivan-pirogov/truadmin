import React, { useState } from 'react';
import { FiX, FiCheck, FiXCircle, FiLoader } from 'react-icons/fi';
import { apiService, AddressCheckResult, AddressCheckStep } from '../../services/api';
import './AddressCheckModal.css';

interface AddressCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseId: string;
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const AddressCheckModal: React.FC<AddressCheckModalProps> = ({ isOpen, onClose, databaseId }) => {
  const [formData, setFormData] = useState({
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    programType: '',
  });
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AddressCheckResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'state') {
      // Store only the state code (first 2 characters)
      setFormData((prev) => ({ ...prev, [name]: value.substring(0, 2).toUpperCase() }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setResult(null);

    try {
      const checkResult = await apiService.checkHohAddressStatus(
        databaseId,
        formData.address1,
        formData.address2,
        formData.city,
        formData.state,
        formData.zip,
        formData.programType
      );

      // Filter out "Normalize Address" step from visualization (unless it has an error)
      const normalizeStep = checkResult.steps.find(step => step.stepName === 'Normalize Address');
      const visibleSteps = checkResult.steps.filter(step => step.stepName !== 'Normalize Address');
      
      // If normalization had an error, add it to the message
      if (normalizeStep && normalizeStep.status === 'error') {
        checkResult.finalMessage = `Normalization Error: ${normalizeStep.message}. ${checkResult.finalMessage}`;
      }

      // Create new result with filtered steps
      const filteredResult: AddressCheckResult = {
        ...checkResult,
        steps: visibleSteps,
      };

      // Set result immediately but start with step 0 (showing processing)
      setResult(filteredResult);
      setCurrentStepIndex(0);
      
      // Wait 2 seconds after result is received
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Show first step as completed
      setCurrentStepIndex(1);
      
      // Process second step (whitelist)
      if (filteredResult.steps.length > 1 && !filteredResult.steps[0].stopProcess) {
        // Always add 1 second delay before showing second step
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setCurrentStepIndex(2);
      }
      
      // Process third step (status list) if it exists and second step didn't stop the process
      if (filteredResult.steps.length > 2 && !filteredResult.steps[0].stopProcess && !filteredResult.steps[1].stopProcess) {
        const thirdStepSkipped = filteredResult.steps[2].result === -1;
        
        // First show third step as processing immediately (so user sees animation during delay)
        setCurrentStepIndex(2.5);
        
        // Add 1 second delay while showing third step as processing ONLY if it's not skipped
        if (!thirdStepSkipped) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        
        // Then mark it as completed (index 3)
        setCurrentStepIndex(3);
      } else {
        // If third step is not shown, set currentStepIndex to the number of completed steps
        setCurrentStepIndex(filteredResult.steps.length);
      }
    } catch (error: any) {
      console.error('Error checking address:', error);
      const errorResult = {
        success: 0,
        steps: [
          {
            stepName: 'Error',
            status: 'error' as const,
            message: 'Failed to check address',
            details: error.message || 'Unknown error',
            result: 0,
            stopProcess: true,
          },
        ],
        finalMessage: 'Address check failed due to an error',
      };
      setResult(errorResult);
      setCurrentStepIndex(1);
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    setFormData({
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      programType: '',
    });
    setResult(null);
    setCurrentStepIndex(-1);
    onClose();
  };

  if (!isOpen) return null;

  const getStepStatus = (step: AddressCheckStep, index: number) => {
    // FIRST: Check if this step is currently being processed (currentStepIndex is between index and index+1)
    // This must be checked BEFORE checking the result status to show processing state
    if (currentStepIndex > index && currentStepIndex < index + 1) {
      return 'processing';
    }
    
    // SECOND: If we have result data, use it directly
    if (result) {
      const resultStep = result.steps[index];
      if (resultStep) {
        if (resultStep.status === 'completed') {
          // Only show as completed if currentStepIndex has passed this step
          if (currentStepIndex >= index + 1) {
            if (resultStep.result === 1) {
              return 'success';
            } else if (resultStep.result === 0) {
              return 'error';
            } else {
              // For skipped steps (result === -1 and message contains "skipped")
              if (resultStep.message.toLowerCase().includes('skipped')) {
                return 'skipped';
              }
              return 'completed';
            }
          } else {
            // Step is not yet reached, show as pending
            return 'pending';
          }
        } else if (resultStep.status === 'processing') {
          return 'processing';
        } else if (resultStep.status === 'pending') {
          return 'pending';
        }
      }
    }
    
    // Fallback: use currentStepIndex
    if (index < currentStepIndex && currentStepIndex >= 0) {
      // Completed step
      if (step.result === 1) {
        return 'success';
      } else if (step.result === 0) {
        return 'error';
      } else {
        return 'completed';
      }
    } else if (index === currentStepIndex && checking) {
      // Current step - processing
      return 'processing';
    } else {
      // Pending step
      return 'pending';
    }
  };

  const getStepIcon = (step: AddressCheckStep, index: number) => {
    const status = getStepStatus(step, index);
    
    if (status === 'processing') {
      return <FiLoader className="step-status-icon step-icon-processing spinning" />;
    } else if (status === 'success') {
      return <FiCheck className="step-status-icon step-icon-success" />;
    } else if (status === 'error') {
      return <FiXCircle className="step-status-icon step-icon-error" />;
    } else if (status === 'skipped') {
      return <div className="step-status-icon step-icon-skipped">—</div>;
    } else if (status === 'completed') {
      return <FiCheck className="step-status-icon step-icon-neutral" />;
    } else {
      return <div className="step-status-icon step-icon-pending" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content address-check-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Check Address Status</h2>
          <button className="modal-close" onClick={handleClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="address-check-form">
          <div className="form-row">
            <div className="form-group form-group-4">
              <label htmlFor="address1">Address 1 *</label>
              <input
                type="text"
                id="address1"
                name="address1"
                value={formData.address1}
                onChange={handleChange}
                required
                disabled={checking}
              />
            </div>
            <div className="form-group form-group-1">
              <label htmlFor="address2">Address 2</label>
              <input
                type="text"
                id="address2"
                name="address2"
                value={formData.address2}
                onChange={handleChange}
                disabled={checking}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group form-group-3">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                disabled={checking}
              />
            </div>
            <div className="form-group form-group-1">
              <label htmlFor="state">State *</label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                disabled={checking}
              >
                <option value="">Select State</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.code} - {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group form-group-1">
              <label htmlFor="zip">Zip *</label>
              <input
                type="text"
                id="zip"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                required
                disabled={checking}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group form-group-full">
              <label htmlFor="programType">Program Type *</label>
              <input
                type="text"
                id="programType"
                name="programType"
                value={formData.programType}
                onChange={handleChange}
                required
                disabled={checking}
                placeholder="e.g., LL, EBB, ACP, LL+EBB, etc."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleClose} disabled={checking} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={checking} className="btn btn-primary">
              {checking ? 'Checking...' : 'Check Address'}
            </button>
          </div>
        </form>

        {checking && !result && (
          <div className="check-process">
            <div className="steps-flow">
              <div className="step-item step-item-processing">
                <div className="step-number">1</div>
                <div className="step-content">
                  <div className="step-title">Check Blacklist</div>
                  <div className="step-status-container">
                    <FiLoader className="step-status-icon step-icon-processing spinning" />
                  </div>
                </div>
                <div className="step-arrow active">→</div>
              </div>
              <div className="step-item step-item-pending">
                <div className="step-number">2</div>
                <div className="step-content">
                  <div className="step-title">Check Whitelist</div>
                  <div className="step-status-container">
                    <div className="step-status-icon step-icon-pending" />
                  </div>
                </div>
                <div className="step-arrow">→</div>
              </div>
              <div className="step-item step-item-pending">
                <div className="step-number">3</div>
                <div className="step-content">
                  <div className="step-title">Check Status List</div>
                  <div className="step-status-container">
                    <div className="step-status-icon step-icon-pending" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(checking || result) && result && (
          <div className="check-process">
            <div className="steps-flow">
              {result?.steps.map((step, index) => {
                const status = getStepStatus(step, index);
                return (
                  <div key={index} className={`step-item step-item-${status}`}>
                    <div className="step-number">{index + 1}</div>
                    <div className="step-content">
                      <div className="step-title">{step.stepName}</div>
                      <div className="step-status-container">
                        {getStepIcon(step, index)}
                      </div>
                    </div>
                    {index < (result?.steps.length || 0) - 1 && (
                      <div className={`step-arrow ${status === 'processing' || status === 'success' || status === 'completed' || status === 'skipped' ? 'active' : ''}`}>
                        →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {result && !checking && (
                <div className={`results-list-container ${result.success === 1 ? 'results-success' : 'results-error'}`}>
                  <h4>{result.success === 1 ? 'CHECK PASSED' : 'CHECK FAILED'}</h4>
                  <div className="results-list">
                    {result.steps.map((step, index) => {
                      const getIcon = () => {
                        if (step.result === 1) {
                          return <FiCheck className="result-icon result-icon-success" />;
                        }
                        if (step.result === 0) {
                          return <FiXCircle className="result-icon result-icon-error" />;
                        }
                        // Skipped or not applicable
                        return <span className="result-icon result-icon-skipped">—</span>;
                      };

                      const getResultText = () => {
                        const stepName = step.stepName.toLowerCase();
                        
                        if (stepName.includes('blacklist')) {
                          if (step.result === 0) {
                            return 'address found in blacklist';
                          }
                          return 'address not found in blacklist';
                        }
                        
                        if (stepName.includes('whitelist')) {
                          if (step.result === 0) {
                            // Extract capacity and occupancy from details
                            const capacityMatch = step.details.match(/Capacity:\s*(\d+)/i);
                            const occupancyMatch = step.details.match(/Occupancy:\s*(\d+)/i);
                            const capacity = capacityMatch ? capacityMatch[1] : '?';
                            const occupancy = occupancyMatch ? occupancyMatch[1] : '?';
                            return `address found in whitelist with occupancy ${occupancy} (limit ${capacity})`;
                          }
                          if (step.result === 1) {
                            const capacityMatch = step.details.match(/Capacity:\s*(\d+)/i);
                            const occupancyMatch = step.details.match(/Occupancy:\s*(\d+)/i);
                            const capacity = capacityMatch ? capacityMatch[1] : '?';
                            const occupancy = occupancyMatch ? occupancyMatch[1] : '?';
                            return `address found in whitelist with occupancy ${occupancy} (limit ${capacity})`;
                          }
                          // If result === -1, check if it was skipped because blacklist stopped the process
                          if (step.result === -1) {
                            // Check if blacklist found the address and stopped the process
                            const blacklistStep = result.steps.find(s => s.stepName.toLowerCase().includes('blacklist'));
                            if (blacklistStep && blacklistStep.result === 0 && blacklistStep.stopProcess) {
                              return 'whitelist check not needed';
                            }
                            // Also check message/details for indication that it was skipped due to blacklist
                            if (step.message.toLowerCase().includes('skipped') && 
                                (step.message.toLowerCase().includes('blacklist') || 
                                 step.details.toLowerCase().includes('blacklist') ||
                                 step.details.toLowerCase().includes('no need to check whitelist'))) {
                              return 'whitelist check not needed';
                            }
                            // In all other cases, whitelist was checked but address not found
                            return 'address not found in whitelist';
                          }
                          return 'address not found in whitelist';
                        }
                        
                        if (stepName.includes('status')) {
                            // Check if address was found (result === 1 or result === 0 means found)
                            if (step.result === 0 || step.result === 1) {
                              // Check if address was not found (occupancy = 0 or "not found" message)
                              const isNotFound = step.message.toLowerCase().includes('not found') || 
                                                step.details.toLowerCase().includes('no occupancy') ||
                                                (step.details.match(/occupancy[:\s]*0/i) && step.result === 1);
                              
                              if (isNotFound && step.result === 1) {
                                // Address not found in status list - this is a new address (success)
                                return 'address found in status list (new address)';
                              }
                              
                              // Extract occupancy from details or message
                              // Format: "Occupancy: X (limit: Y)" or "Occupancy: X, limit: Y"
                              const occupancyMatch = step.details.match(/occupancy[:\s]*(\d+)/i) || step.message.match(/occupancy[:\s]*(\d+)/i);
                              const limitMatch = step.details.match(/\(limit[:\s]*(\d+)\)/i) || step.details.match(/limit[:\s]*(\d+)/i) || step.message.match(/limit[:\s]*(\d+)/i);
                              const occupancy = occupancyMatch ? occupancyMatch[1] : '?';
                              const limit = limitMatch ? limitMatch[1] : '5';
                              return `address found in status list with occupancy ${occupancy} (limit ${limit})`;
                            }
                            // If result === -1, check if it was skipped or if whitelist check passed
                            if (step.result === -1) {
                              // Check if previous step was whitelist with success (process stopped)
                              const whitelistStep = result.steps.find(s => s.stepName.toLowerCase().includes('whitelist'));
                              if (whitelistStep && whitelistStep.result === 1 && whitelistStep.stopProcess) {
                                return 'status list check not needed';
                              }
                              // Check message for skipped indication
                              if (step.message.toLowerCase().includes('skipped') || step.message.toLowerCase().includes('not needed') || step.details.toLowerCase().includes('not needed')) {
                                return 'status list check not needed';
                              }
                            }
                            return 'address not found in status list';
                          }
                          
                          // For skipped steps
                          if (step.result === -1 && (step.message.toLowerCase().includes('skipped') || step.message.toLowerCase().includes('not needed'))) {
                            if (stepName.includes('whitelist')) {
                              return 'whitelist check not needed';
                            }
                          }
                          
                          return step.message;
                      };

                      return (
                        <div key={index} className="result-line">
                          {getIcon()}
                          <span className="result-text">{getResultText()}</span>
                        </div>
                      );
                      })}
                    </div>
                  </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default AddressCheckModal;

