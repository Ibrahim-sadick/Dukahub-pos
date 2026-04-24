import React from 'react';

export default function SectionLanding({ title, description }) {
  return (
    <div className="p-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="text-lg font-semibold text-gray-900">{String(title || '').trim() || 'Section'}</div>
        <div className="mt-2 text-sm text-gray-600">
          {String(description || '').trim() || 'Select an option from the sidebar menu to continue.'}
        </div>
      </div>
    </div>
  );
}

