import React from 'react';
import EmployeeSelect from '../../../../../components/EmployeeSelect';

interface FormState {
  fdDirequest?: string;
  fdBilling?: string;
  fdAR?: string;
}

interface StepOfficersProps {
  form: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  canSave: boolean;
  direquestError?: string | null;
}

export default function StepOfficers({ form, onChange, canSave, direquestError }: StepOfficersProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[1rem] font-semibold text-primary">Officers / PIC</h2>
        <p className="text-secondary text-xs mt-0.5">Data penanggung jawab diambil dari database SEJDB2020.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Di-request — WAJIB */}
        <div>
          <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
            Di-request (CSO / Shipment){' '}
            <span className="text-rose-500">*</span>
          </label>
          <EmployeeSelect
            role="direquest"
            value={form.fdDirequest || ''}
            onChange={(val) => onChange('fdDirequest', val)}
            placeholder="Pilih CSO / Shipment..."
            disabled={!canSave}
          />
          {direquestError && (
            <p className="mt-1 text-[0.75rem] text-rose-500 font-medium">{direquestError}</p>
          )}
        </div>

        {/* Billing */}
        <div>
          <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
            Billing
          </label>
          <EmployeeSelect
            role="billing"
            value={form.fdBilling || ''}
            onChange={(val) => onChange('fdBilling', val)}
            placeholder="Pilih Billing..."
            disabled={!canSave}
          />
        </div>

        {/* AR */}
        <div>
          <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
            AR (Finance)
          </label>
          <EmployeeSelect
            role="ar"
            value={form.fdAR || ''}
            onChange={(val) => onChange('fdAR', val)}
            placeholder="Pilih AR..."
            disabled={!canSave}
          />
        </div>
      </div>
    </div>
  );
}
