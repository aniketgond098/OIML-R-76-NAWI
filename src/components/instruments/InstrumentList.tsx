import React, { useState } from 'react';
import { Instrument } from '../../types/instrument';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import {
  Scale,
  Plus,
  Search,
  Filter,
  Play,
  FileText,
  ChevronRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface Props {
  onSelectInstrument: (id: string) => void;
  onStartNewTest: (instrumentId: string) => void;
  onOpenNewWizard: () => void;
}

export const InstrumentList: React.FC<Props> = ({
  onSelectInstrument,
  onStartNewTest,
  onOpenNewWizard,
}) => {
  const { canCreateInstrument } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

  const instruments = db.getInstruments();

  const filteredInstruments = instruments.filter((inst) => {
    const matchesSearch =
      inst.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.instrumentIdTag.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = selectedClass === 'ALL' || inst.accuracyClass === selectedClass;

    return matchesSearch && matchesClass;
  });

  const classBadges: Record<string, string> = {
    CLASS_I: 'bg-amber-50 text-amber-800 border-amber-200',
    CLASS_II: 'bg-blue-50 text-blue-800 border-blue-200',
    CLASS_III: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    CLASS_IIII: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div id="instruments-list-view" className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Scale size={22} className="text-indigo-600 shrink-0" />
            <span>Registered Weighing Instruments (NAWI)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Master database of all Non-Automatic Weighing Instruments under verification jurisdiction
          </p>
        </div>

        {canCreateInstrument && (
          <button
            id="register-instrument-btn"
            onClick={onOpenNewWizard}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus size={16} />
            Register New Instrument
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search manufacturer, model, serial #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter size={14} className="text-slate-400 shrink-0 hidden sm:inline" />
          <span className="text-xs text-slate-500 font-medium shrink-0">Class:</span>
          {['ALL', 'CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'].map((cls) => (
            <button
              key={cls}
              id={`filter-class-${cls.toLowerCase()}`}
              onClick={() => setSelectedClass(cls)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 ${
                selectedClass === cls
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cls === 'ALL' ? 'All Classes' : `Class ${cls.replace('CLASS_', '')}`}
            </button>
          ))}
        </div>
      </div>

      {/* Instruments Table / Grid */}
      {filteredInstruments.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No instruments matching criteria"
          description="Try adjusting your search query or class filter, or register a new instrument."
          actionLabel={canCreateInstrument ? 'Register Instrument' : undefined}
          onAction={onOpenNewWizard}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-5">Instrument / Model</th>
                  <th className="p-3.5">Serial No & Tag</th>
                  <th className="p-3.5">Accuracy Class</th>
                  <th className="p-3.5">Capacity & Intervals</th>
                  <th className="p-3.5">Receptor & Geometry</th>
                  <th className="p-3.5 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInstruments.map((inst) => (
                  <tr
                    key={inst.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="p-3.5 pl-5" onClick={() => onSelectInstrument(inst.id)}>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">
                        {inst.manufacturer} {inst.model}
                      </div>
                      <div className="text-[11px] text-slate-500">{inst.instrumentType}</div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-700" onClick={() => onSelectInstrument(inst.id)}>
                      <div className="font-semibold text-slate-900">{inst.serialNumber}</div>
                      <div className="text-[10px] text-slate-400">{inst.instrumentIdTag}</div>
                    </td>

                    <td className="p-3.5" onClick={() => onSelectInstrument(inst.id)}>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          classBadges[inst.accuracyClass] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Class {inst.accuracyClass.replace('CLASS_', '')}
                      </span>
                    </td>

                    <td className="p-3.5" onClick={() => onSelectInstrument(inst.id)}>
                      <div className="font-semibold text-slate-900">
                        Max {inst.maxCapacity} {inst.unit} / Min {inst.minCapacity} {inst.unit}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        e = {inst.verificationScaleInterval} {inst.unit} (n = {inst.numberOfIntervals.toLocaleString()})
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-600" onClick={() => onSelectInstrument(inst.id)}>
                      <div>{inst.loadReceptorType}</div>
                      <div className="text-[10px] text-slate-400">{inst.numberOfSupportPoints} points of support</div>
                    </td>

                    <td className="p-3.5 pr-5 text-right space-x-2">
                      <button
                        id={`btn-view-inst-${inst.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInstrument(inst.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors"
                        title="View Full Profile"
                      >
                        <Eye size={13} />
                        Profile
                      </button>
                      <button
                        id={`btn-start-test-${inst.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartNewTest(inst.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-2xs transition-colors"
                        title="Start New Test Session"
                      >
                        <Play size={13} />
                        Start Test
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
