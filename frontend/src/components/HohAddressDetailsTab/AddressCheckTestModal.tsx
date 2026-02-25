import React, { useState } from 'react';
import { FiX, FiCheck, FiXCircle, FiLoader } from 'react-icons/fi';
import { AddressCheckResult, AddressCheckStep } from '../../services/api';
import './AddressCheckModal.css';

interface AddressCheckTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseId: string;
}

const AddressCheckTestModal: React.FC<AddressCheckTestModalProps> = ({ isOpen, onClose, databaseId }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AddressCheckResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  type ScenarioType = 'normal' | 'whitelist' | 'whitelistCapacityExceeded' | 'statusListFailed' | 'blacklist' | 'notFound';
  const [scenario, setScenario] = useState<ScenarioType>('normal');
  const [testData] = useState({
    address1: '123 Main St',
    address2: 'Apt 4B',
    city: 'Houston',
    state: 'TX',
    zip: '77001',
    programType: 'LL',
  });

  const handleTest = async () => {
    setChecking(true);
    
    // Use selected scenario
    const selectedScenario = scenario;
    
    // Mock result data for demonstration - initialize all steps
    const initialMockResult: AddressCheckResult = {
      success: 1,
      steps: [
        {
          stepName: 'Check Blacklist',
          status: 'processing' as const,
          message: 'Checking if address exists in blacklist',
          details: selectedScenario === 'blacklist' 
            ? 'Address found in blacklist' 
            : 'Address not found in blacklist',
          result: -1,
          stopProcess: false,
        },
        {
          stepName: 'Check Whitelist',
          status: 'pending' as const,
          message: 'Checking if address exists in whitelist',
          details: selectedScenario === 'whitelist' 
            ? 'Address found in whitelist with sufficient capacity' 
            : 'Address not found in whitelist',
          result: -1,
          stopProcess: false,
        },
        {
          stepName: 'Check Status List',
          status: 'pending' as const,
          message: 'Checking occupancy in status list',
          details: selectedScenario === 'statusListFailed' 
            ? 'Address found in status list with high occupancy' 
            : 'Address not found in status list',
          result: -1,
          stopProcess: false,
        },
      ],
      finalMessage: selectedScenario === 'blacklist'
        ? 'Address is in blacklist - CHECK FAILED'
        : selectedScenario === 'whitelist'
        ? 'Address is in whitelist with capacity 10 (occupancy: 3) - CHECK PASSED'
        : selectedScenario === 'statusListFailed'
        ? 'Address is in status list with occupancy 8 (exceeds limit of 5) - CHECK FAILED'
        : selectedScenario === 'notFound'
        ? 'Address not found in any list - CHECK PASSED'
        : 'Address is in status list with occupancy 3 (within limit) - CHECK PASSED',
    };

    // Show all steps immediately - first is processing, others are pending
    setResult(initialMockResult);
    setCurrentStepIndex(0);

    try {
      // Step 1: Wait 5 seconds with first step processing
      await new Promise((resolve) => setTimeout(resolve, 5000));
      
      if (selectedScenario === 'blacklist') {
        // BLACKLIST SCENARIO: Address found in blacklist - stop here with error
        const step1CompleteBlacklist: AddressCheckResult = {
          ...initialMockResult,
          steps: [
            {
              ...initialMockResult.steps[0],
              status: 'completed' as const,
              result: 0,
              message: 'Address found in blacklist',
              details: 'Address is blocked',
              stopProcess: true,
            },
            {
              ...initialMockResult.steps[1],
              status: 'completed' as const,
              result: -1,
              message: 'Step skipped - address already blocked in blacklist',
              details: 'No need to check whitelist',
            },
            {
              ...initialMockResult.steps[2],
              status: 'completed' as const,
              result: -1,
              message: 'Step skipped - address already blocked in blacklist',
              details: 'No need to check status list',
            },
          ],
          success: 0,
          finalMessage: 'Address is in blacklist - CHECK FAILED',
        };
        setResult(step1CompleteBlacklist);
        setCurrentStepIndex(3);
      } else {
        // Step 1 completed - mark as success
        const step1Complete: AddressCheckResult = {
          ...initialMockResult,
          steps: [
            {
              ...initialMockResult.steps[0],
              status: 'completed' as const,
              result: 1,
            },
            initialMockResult.steps[1],
            initialMockResult.steps[2],
          ],
        };
        setResult(step1Complete);
        
        // Step 2: Activate second step (make it processing, others stay as is)
        setCurrentStepIndex(1);
        const step2Processing: AddressCheckResult = {
          ...step1Complete,
          steps: [
            step1Complete.steps[0],
            {
              ...step1Complete.steps[1],
              status: 'processing' as const,
            },
            step1Complete.steps[2],
          ],
        };
        setResult(step2Processing);
        
        // Wait 5 seconds for step 2
        await new Promise((resolve) => setTimeout(resolve, 5000));
        
          if (selectedScenario === 'whitelist') {
            // WHITELIST SCENARIO: Address found in whitelist
            // Step 2 completed (found in whitelist) - mark as success
            const step2CompleteWhitelist: AddressCheckResult = {
              ...step2Processing,
              steps: [
                step2Processing.steps[0],
                {
                  ...step2Processing.steps[1],
                  status: 'completed' as const,
                  result: 1,
                  message: 'Address found in whitelist with sufficient capacity',
                  details: 'Capacity: 10, Occupancy: 3',
                  stopProcess: true,
                },
                {
                  ...step2Processing.steps[2],
                  status: 'completed' as const,
                  result: -1,
                  message: 'Step skipped - address already approved in whitelist',
                  details: 'Status list check not required',
                },
              ],
              success: 1,
              finalMessage: 'Address is in whitelist with capacity 10 (occupancy: 3) - CHECK PASSED',
            };
            setResult(step2CompleteWhitelist);
            setCurrentStepIndex(3); // Mark all as completed (step 3 is skipped)
          } else if (selectedScenario === 'statusListFailed') {
            // STATUS LIST FAILED SCENARIO: Address not in whitelist, but Status List check fails
            // Step 2 completed (not in whitelist) - mark as skipped
            const step2Complete: AddressCheckResult = {
              ...step2Processing,
              steps: [
                step2Processing.steps[0],
                {
                  ...step2Processing.steps[1],
                  status: 'completed' as const,
                  result: -1,
                  message: 'Step skipped - address not found in whitelist',
                  details: 'Proceeding to status list check',
                },
                step2Processing.steps[2],
              ],
            };
            setResult(step2Complete);
            
            // Step 3: Activate third step
            setCurrentStepIndex(2);
            const step3Processing: AddressCheckResult = {
              ...step2Complete,
              steps: [
                step2Complete.steps[0],
                step2Complete.steps[1],
                {
                  ...step2Complete.steps[2],
                  status: 'processing' as const,
                  message: 'Checking occupancy in status list',
                  details: 'Searching for address in status list...',
                },
              ],
            };
            setResult(step3Processing);
            
            // Wait 5 seconds for step 3
            await new Promise((resolve) => setTimeout(resolve, 5000));
            
            // Step 3 failed - address found in status list but occupancy exceeds limit
            const step3Complete: AddressCheckResult = {
              ...step3Processing,
              steps: [
                step3Processing.steps[0],
                step3Processing.steps[1],
                {
                  ...step3Processing.steps[2],
                  status: 'completed' as const,
                  result: 0,
                  message: 'Address found in status list but occupancy exceeds limit',
                  details: 'Occupancy: 8 (limit: 5)',
                },
              ],
              success: 0,
              finalMessage: 'Address is in status list with occupancy 8 (exceeds limit of 5) - CHECK FAILED',
            };
            setResult(step3Complete);
            
            // Show final result
            setCurrentStepIndex(3);
          } else if (selectedScenario === 'notFound') {
            // NOT FOUND SCENARIO: Address not found in any table
            // Step 2 completed (not in whitelist) - mark as skipped
            const step2Complete: AddressCheckResult = {
              ...step2Processing,
              steps: [
                step2Processing.steps[0],
                {
                  ...step2Processing.steps[1],
                  status: 'completed' as const,
                  result: -1,
                  message: 'Address not found in whitelist',
                  details: 'Proceeding to status list check',
                },
                step2Processing.steps[2],
              ],
            };
            setResult(step2Complete);
            
            // Step 3: Activate third step
            setCurrentStepIndex(2);
            const step3Processing: AddressCheckResult = {
              ...step2Complete,
              steps: [
                step2Complete.steps[0],
                step2Complete.steps[1],
                {
                  ...step2Complete.steps[2],
                  status: 'processing' as const,
                  message: 'Checking occupancy in status list',
                  details: 'Searching for address in status list...',
                },
              ],
            };
            setResult(step3Processing);
            
            // Wait 5 seconds for step 3
            await new Promise((resolve) => setTimeout(resolve, 5000));
            
            // Step 3 completed - address not found in status list (success)
            const step3Complete: AddressCheckResult = {
              ...step3Processing,
              steps: [
                step3Processing.steps[0],
                step3Processing.steps[1],
                {
                  ...step3Processing.steps[2],
                  status: 'completed' as const,
                  result: 1,
                  message: 'Address not found in status list',
                  details: 'No occupancy data found',
                },
              ],
              success: 1,
              finalMessage: 'Address not found in any list - CHECK PASSED',
            };
            setResult(step3Complete);
            
            // Show final result
            setCurrentStepIndex(3);
          } else {
            // NORMAL SCENARIO: Address not in whitelist - continue to Status List
            // Step 2 completed (not in whitelist) - mark as skipped
            const step2Complete: AddressCheckResult = {
              ...step2Processing,
              steps: [
                step2Processing.steps[0],
                {
                  ...step2Processing.steps[1],
                  status: 'completed' as const,
                  result: -1,
                  message: 'Step skipped - address not found in whitelist',
                  details: 'Proceeding to status list check',
                },
                step2Processing.steps[2],
              ],
            };
            setResult(step2Complete);
            
            // Step 3: Activate third step
            setCurrentStepIndex(2);
            const step3Processing: AddressCheckResult = {
              ...step2Complete,
              steps: [
                step2Complete.steps[0],
                step2Complete.steps[1],
                {
                  ...step2Complete.steps[2],
                  status: 'processing' as const,
                  message: 'Checking occupancy in status list',
                  details: 'Searching for address in status list...',
                },
              ],
            };
            setResult(step3Processing);
            
            // Wait 5 seconds for step 3
            await new Promise((resolve) => setTimeout(resolve, 5000));
            
            // Step 3 completed - address found in status list with acceptable occupancy
            const step3Complete: AddressCheckResult = {
              ...step3Processing,
              steps: [
                step3Processing.steps[0],
                step3Processing.steps[1],
                {
                  ...step3Processing.steps[2],
                  status: 'completed' as const,
                  result: 1,
                  message: 'Address found in status list with acceptable occupancy',
                  details: 'Occupancy: 3 (limit: 5)',
                },
              ],
              success: 1,
              finalMessage: 'Address is in status list with occupancy 3 (within limit) - CHECK PASSED',
            };
            setResult(step3Complete);
            
            // Show final result
            setCurrentStepIndex(3);
          }
        }
    } catch (error: any) {
      console.error('Error in test:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setCurrentStepIndex(-1);
    onClose();
  };

  const getStepStatus = (step: AddressCheckStep, index: number) => {
    // If we have result data, use it directly
    if (result) {
      const resultStep = result.steps[index];
      if (resultStep) {
        if (resultStep.status === 'completed') {
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content address-check-test-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Test Address Check Process</h2>
          <button className="modal-close" onClick={handleClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="test-info">
            <p>This is a demonstration of the address check process with test data:</p>
            <div className="test-data">
              <div><strong>Address:</strong> {testData.address1}, {testData.address2}</div>
              <div><strong>City:</strong> {testData.city}, {testData.state} {testData.zip}</div>
              <div><strong>Program Type:</strong> {testData.programType}</div>
            </div>
            <div className="scenario-selector" style={{ marginTop: '12px' }}>
              <label htmlFor="scenario-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                Select Test Scenario:
              </label>
              <select
                id="scenario-select"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as ScenarioType)}
                disabled={checking}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: checking ? '#f5f5f5' : 'white',
                  cursor: checking ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="normal">Normal - Address not in Whitelist (Status List passes)</option>
                <option value="whitelist">Whitelist - Address found in Whitelist with sufficient capacity (Status List skipped)</option>
                <option value="whitelistCapacityExceeded">Whitelist Capacity Exceeded - Capacity &lt;= Occupancy (CHECK FAILED)</option>
                <option value="statusListFailed">Status List Failed - Occupancy exceeds limit (CHECK FAILED)</option>
                <option value="blacklist">Blacklist - Address found in Blacklist (CHECK FAILED)</option>
                <option value="notFound">Not Found - Address not found in any table (CHECK PASSED)</option>
              </select>
            </div>
          </div>

          <div className="test-actions">
            <button
              type="button"
              onClick={handleTest}
              disabled={checking}
              className="btn btn-primary"
            >
              {checking ? 'Checking...' : 'Start Test'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={checking}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>

          {(checking || result) && (
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
                          if (step.result === -1 && (step.message.toLowerCase().includes('skipped') || step.message.toLowerCase().includes('не нужна'))) {
                            if (stepName.includes('whitelist')) {
                              return 'проверка вайтлист не нужна';
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

export default AddressCheckTestModal;

