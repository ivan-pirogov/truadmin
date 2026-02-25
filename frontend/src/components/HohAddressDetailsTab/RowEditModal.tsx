import React, { useState, useEffect } from 'react';
import '../HohAddressDetailsTab/HohAddressDetailsTab.css';

interface RowEditModalProps {
  columns: string[];
  initialData?: Record<string, any>;
  onSave: (data: Record<string, any>) => void;
  onCancel: () => void;
  title: string;
}

// US States list for combobox
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
].sort((a, b) => a.name.localeCompare(b.name));

const RowEditModal: React.FC<RowEditModalProps> = ({
  columns,
  initialData,
  onSave,
  onCancel,
  title,
}) => {
  // Fields to exclude from the form
  const excludedFields = ['id', 'updatedby', 'updatedon', 'address1_upd', 'address2_upd', 'city_upd'];

  // Filter out excluded fields
  const editableColumns = columns.filter((col) => !excludedFields.includes(col.toLowerCase()));

  // Check if capacity field exists (for whitelist)
  const hasCapacity = editableColumns.includes('capacity');

  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});

  useEffect(() => {
    if (initialData) {
      // Ensure state is stored as code (2 uppercase letters)
      const processedData = { ...initialData };
      if (processedData.state) {
        const stateValue = String(processedData.state).trim().toUpperCase();
        // If it's a full state name, try to find the code
        if (stateValue.length > 2) {
          const state = US_STATES.find(
            (s) =>
              s.name.toUpperCase() === stateValue ||
              s.code === stateValue ||
              stateValue.includes(s.code) ||
              stateValue.includes(s.name.toUpperCase())
          );
          if (state) {
            processedData.state = state.code;
          } else {
            // If not found, try to extract code from format "TX - Texas"
            const match = stateValue.match(/^([A-Z]{2})\s*-\s*/);
            if (match) {
              processedData.state = match[1];
            } else {
              // Keep as is if can't determine
              processedData.state = stateValue.substring(0, 2).toUpperCase();
            }
          }
        } else {
          // Already a code, ensure uppercase
          processedData.state = stateValue.substring(0, 2).toUpperCase();
        }
      }
      setFormData(processedData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only send editable fields
    const editableData: Record<string, any> = {};
    editableColumns.forEach((col) => {
      if (formData[col] !== undefined) {
        let value = formData[col];
        // Ensure state is saved as uppercase 2-letter code
        if (col.toLowerCase() === 'state' && value) {
          const stateValue = String(value).trim().toUpperCase();
          // Extract code if format is "TX - Texas"
          const match = stateValue.match(/^([A-Z]{2})\s*-\s*/);
          if (match) {
            value = match[1];
          } else {
            value = stateValue.substring(0, 2).toUpperCase();
          }
        }
        editableData[col] = value;
      }
    });
    onSave(editableData);
  };

  const handleChange = (column: string, value: any) => {
    setFormData((prev) => ({ ...prev, [column]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Row 1: address1, address2 (4:1) */}
            <div className="form-row">
              <div className="form-group form-group-4">
                <label>address1</label>
                <input
                  type="text"
                  value={String(formData['address1'] ?? '')}
                  onChange={(e) => handleChange('address1', e.target.value)}
                />
              </div>
              <div className="form-group form-group-1">
                <label>address2</label>
                <input
                  type="text"
                  value={String(formData['address2'] ?? '')}
                  onChange={(e) => handleChange('address2', e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: city, state, zip (3:1:1) */}
            <div className="form-row">
              <div className="form-group form-group-3">
                <label>city</label>
                <input
                  type="text"
                  value={String(formData['city'] ?? '')}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="form-group form-group-1">
                <label>state</label>
                <select
                  value={String(formData['state'] ?? '').toUpperCase().substring(0, 2)}
                  onChange={(e) => {
                    // Store only the code (2 uppercase letters)
                    const code = e.target.value.toUpperCase().substring(0, 2);
                    handleChange('state', code);
                  }}
                >
                  <option value="">Select state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.code} - {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group form-group-1">
                <label>zip</label>
                <input
                  type="text"
                  value={String(formData['zip'] ?? '')}
                  onChange={(e) => handleChange('zip', e.target.value)}
                />
              </div>
            </div>

            {/* Row 3: category and capacity (5:1) */}
            <div className="form-row">
              <div className="form-group form-group-5">
                <label>category</label>
                <input
                  type="text"
                  value={String(formData['category'] ?? '')}
                  onChange={(e) => handleChange('category', e.target.value)}
                />
              </div>
              {hasCapacity && (
                <div className="form-group form-group-1">
                  <label>capacity</label>
                  <input
                    type="number"
                    value={String(formData['capacity'] ?? '')}
                    onChange={(e) => handleChange('capacity', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Row 4: description */}
            <div className="form-row">
              <div className="form-group form-group-full">
                <label>description</label>
                <textarea
                  value={String(formData['description'] ?? '')}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RowEditModal;

