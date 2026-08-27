import React, { useState } from 'react';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import { Wrench, ShieldCheck, AlertCircle, Search, Calendar, CheckCircle2 } from 'lucide-react';
import { TestEquipment } from '../../types/equipment';

export const EquipmentRegistry: React.FC = () => {
  const { canManageEquipment } = useAuth();
  const equipmentList = db.getEquipmentList();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = equipmentList.filter(
    (eq) =>
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.equipmentIdTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.calibrationCertificateNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="equipment-registry-view" className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench size={22} className="text-indigo-600 shrink-0" />
            <span>Metrological Equipment & Standard Weights Registry</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Traceable OIML R 111 Class E2, F1, F2 reference test weights and environmental loggers
          </p>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search equipment, cert #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono self-end sm:self-auto">{equipmentList.length} Active Standards</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-5">Equipment Tag & Name</th>
                <th className="p-3.5">Standard Class / Range</th>
                <th className="p-3.5">Calibration Certificate</th>
                <th className="p-3.5">Calibration Date</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5 pr-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((eq) => {
                const isExpired = new Date(eq.calibrationExpiryDate) < new Date();
                return (
                  <tr key={eq.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 pl-5">
                      <div className="font-bold text-slate-900">{eq.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{eq.equipmentIdTag} ({eq.equipmentType})</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{eq.weightClass ? `Class ${eq.weightClass}` : eq.equipmentType}</div>
                      <div className="text-[11px] text-slate-500">{eq.nominalRange}</div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-700">
                      {eq.calibrationCertificateNumber}
                    </td>

                    <td className="p-3.5 text-slate-600">
                      {new Date(eq.calibrationDate).toLocaleDateString()}
                    </td>

                    <td className="p-3.5">
                      <span className={`font-semibold ${isExpired ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                        {new Date(eq.calibrationExpiryDate).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="p-3.5 pr-5 text-right">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                          <AlertCircle size={12} /> EXPIRED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          <CheckCircle2 size={12} /> ACTIVE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
