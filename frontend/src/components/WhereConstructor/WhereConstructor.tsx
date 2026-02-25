import React, { useState, useEffect, useRef } from 'react';
import './WhereConstructor.css';

interface WhereConstructorProps {
  columns: string[];
  value: string;
  onChange: (value: string) => void;
  onApply: (whereValue: string) => void;
  showConstructor: boolean;
  onToggleConstructor: (show: boolean) => void;
}

const WhereConstructor: React.FC<WhereConstructorProps> = ({
  columns,
  value,
  onChange,
  onApply,
  showConstructor,
  onToggleConstructor,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [validationError, setValidationError] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value with prop value when it changes externally
  useEffect(() => {
    setLocalValue(value);
    validateWhereClause(value);

    // Cleanup timeout on unmount
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [value]);

  // Validate WHERE clause
  const validateWhereClause = (whereClause: string): boolean => {
    const trimmed = whereClause.trim();

    // Empty is valid (will be ignored)
    if (!trimmed) {
      setValidationError('');
      return true;
    }

    // Check parentheses balance
    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      setValidationError(`Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`);
      return false;
    }

    // Check for SQL injection patterns (basic check)
    const dangerousPatterns = [
      /;\s*(drop|delete|truncate|alter|create|insert|update|exec|execute)/i,
      /--/,
      /\/\*/,
      /\*\//,
      /union\s+select/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        setValidationError('Potentially dangerous SQL detected. Only WHERE conditions are allowed.');
        return false;
      }
    }

    // Check for valid field names (only allow columns from the list)
    // First, remove string literals (single and double quotes) to avoid matching inside them
    let sqlWithoutStrings = trimmed;
    // Remove single-quoted strings
    sqlWithoutStrings = sqlWithoutStrings.replace(/'[^']*'/g, '');
    // Remove double-quoted strings
    sqlWithoutStrings = sqlWithoutStrings.replace(/"[^"]*"/g, '');

    // Extract field names from the WHERE clause (outside of string literals)
    const fieldPattern = /\b([a-z_][a-z0-9_]*)\b/gi;
    const matches = sqlWithoutStrings.matchAll(fieldPattern);
    const usedFields = new Set<string>();

    for (const match of matches) {
      const fieldName = match[1].toLowerCase();
      // Skip SQL keywords and operators
      const sqlKeywords = [
        'and',
        'or',
        'not',
        'in',
        'like',
        'ilike',
        'is',
        'null',
        'true',
        'false',
        'between',
        'exists',
        'cast',
        'as',
        'text',
      ];
      if (!sqlKeywords.includes(fieldName)) {
        usedFields.add(fieldName);
      }
    }

    // Check if all used fields are in the allowed columns list
    const allowedFields = new Set(columns.map((col) => col.toLowerCase()));
    const invalidFields: string[] = [];

    for (const field of usedFields) {
      if (!allowedFields.has(field)) {
        invalidFields.push(field);
      }
    }

    if (invalidFields.length > 0) {
      setValidationError(
        `Invalid field(s): ${invalidFields.join(', ')}. Only columns from the table are allowed.`
      );
      return false;
    }

    // Check for proper operator usage
    // Operators should not be at the start or end (unless it's a unary operator)
    const trimmedEnd = trimmed.trim();
    if (/^(AND|OR)$/i.test(trimmedEnd)) {
      setValidationError('WHERE clause cannot start or end with AND/OR');
      return false;
    }

    // Check for consecutive operators
    if (/(AND|OR)\s+(AND|OR)/i.test(trimmed)) {
      setValidationError('Cannot have consecutive AND/OR operators');
      return false;
    }

    // Check for operator without value (e.g., "field = " or "field ILIKE ")
    if (/=\s*$|ILIKE\s*$|LIKE\s*$|>\s*$|<\s*$|>=\s*$|<=\s*$/i.test(trimmed)) {
      setValidationError('Operator is missing a value');
      return false;
    }

    setValidationError('');
    return true;
  };

  const insertField = (fieldName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = localValue;
    const newValue = currentValue.substring(0, start) + fieldName + currentValue.substring(end);

    setLocalValue(newValue);

    // Set cursor position after inserted text
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + fieldName.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const insertOperator = (operator: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = localValue;

    // For parentheses, don't add spaces
    const insertText = operator === '(' || operator === ')' ? operator : ` ${operator} `;

    const newValue = currentValue.substring(0, start) + insertText + currentValue.substring(end);

    setLocalValue(newValue);

    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + insertText.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmedValue = localValue.trim();

    // Validate before applying
    if (!validateWhereClause(trimmedValue)) {
      return; // Don't apply if validation fails
    }

    console.log('WhereConstructor handleApply, value:', trimmedValue);
    onChange(trimmedValue);
    onApply(trimmedValue);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalValue('');
    onChange('');
    onApply('');
  };

  return (
    <div className="where-constructor-container">
      <button
        type="button"
        onClick={() => onToggleConstructor(!showConstructor)}
        className="btn btn-secondary btn-sm where-constructor-toggle"
      >
        {showConstructor ? '▼' : '▶'} WHERE Constructor
      </button>

      {showConstructor && (
        <div className="where-constructor-panel">
          <div className="where-constructor-editor">
            <div className="where-constructor-toolbar">
              <span className="where-constructor-label">Operators:</span>
              <button
                type="button"
                onClick={() => insertOperator('(')}
                className="btn btn-sm btn-outline-secondary"
              >
                (
              </button>
              <button
                type="button"
                onClick={() => insertOperator(')')}
                className="btn btn-sm btn-outline-secondary"
              >
                )
              </button>
              <button
                type="button"
                onClick={() => insertOperator('AND')}
                className="btn btn-sm btn-outline-secondary"
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => insertOperator('OR')}
                className="btn btn-sm btn-outline-secondary"
              >
                OR
              </button>
              <button
                type="button"
                onClick={() => insertOperator('=')}
                className="btn btn-sm btn-outline-secondary"
              >
                =
              </button>
              <button
                type="button"
                onClick={() => insertOperator('ILIKE')}
                className="btn btn-sm btn-outline-secondary"
              >
                ILIKE
              </button>
              <button
                type="button"
                onClick={() => insertOperator('>')}
                className="btn btn-sm btn-outline-secondary"
              >
                &gt;
              </button>
              <button
                type="button"
                onClick={() => insertOperator('<')}
                className="btn btn-sm btn-outline-secondary"
              >
                &lt;
              </button>
              <button
                type="button"
                onClick={() => insertOperator('>=')}
                className="btn btn-sm btn-outline-secondary"
              >
                &gt;=
              </button>
              <button
                type="button"
                onClick={() => insertOperator('<=')}
                className="btn btn-sm btn-outline-secondary"
              >
                &lt;=
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={(e) => {
                const newValue = e.target.value;
                setLocalValue(newValue);
                // Clear previous timeout
                if (validationTimeoutRef.current) {
                  clearTimeout(validationTimeoutRef.current);
                }
                // Validate on change (debounced)
                validationTimeoutRef.current = setTimeout(() => {
                  validateWhereClause(newValue);
                }, 300);
              }}
              placeholder="Enter WHERE condition (e.g., state = 'TX' AND city ILIKE '%West%')"
              className={`where-constructor-textarea ${validationError ? 'where-constructor-textarea--error' : ''}`}
              rows={4}
            />
            {validationError && <div className="where-constructor-error">{validationError}</div>}
            <div className="where-constructor-actions">
              <button
                type="button"
                onClick={handleApply}
                className="btn btn-primary btn-sm"
                disabled={!!validationError}
                title={validationError || 'Apply WHERE condition'}
              >
                Apply WHERE
              </button>
              <button type="button" onClick={handleClear} className="btn btn-secondary btn-sm">
                Clear
              </button>
            </div>
          </div>
          <div className="where-constructor-fields">
            <div className="where-constructor-fields-header">Fields:</div>
            <div className="where-constructor-fields-list">
              {columns.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => insertField(col)}
                  className="where-constructor-field-btn"
                  title={`Click to insert: ${col}`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhereConstructor;

