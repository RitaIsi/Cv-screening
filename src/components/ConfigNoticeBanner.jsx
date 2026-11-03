import React from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { AlertTriangle } from 'lucide-react';

export default function ConfigNoticeBanner() {
  if (isSupabaseConfigured) return null;

  return (
    <div style={{
      backgroundColor: '#FFF4ED',
      borderBottom: '1px solid #FED7CC',
      color: '#932204',
      padding: '10px 16px',
      fontSize: '13px',
      lineHeight: '1.4'
    }}>
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#FE3C01" />
          <span>
            <strong>Supabase Setup Required:</strong> HireMatch is running with placeholder credentials. Please update your <code>.env</code> file with your actual Supabase URL and Anon Key to enable live authentication and database operations.
          </span>
        </div>
        <span style={{ fontSize: '12px', opacity: 0.85 }}>Check README.md for 2-minute setup instructions</span>
      </div>
    </div>
  );
}
