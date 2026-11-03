import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function SkillChipInput({ skills = [], onChange, label = 'Skills', placeholder = 'e.g. React, Python, Docker (press Enter)' }) {
  const [inputVal, setInputVal] = useState('');

  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    // Split on commas if multiple pasted
    const newItems = trimmed
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !skills.some((existing) => existing.toLowerCase() === s.toLowerCase()));

    if (newItems.length > 0) {
      onChange([...skills, ...newItems]);
    }
    setInputVal('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="form-input"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddSkill}
          style={{ height: '44px', flexShrink: 0 }}
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
          {skills.map((skill) => (
            <span key={skill} className="hm-chip">
              {skill}
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--color-muted)',
                }}
                aria-label={`Remove ${skill}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
