import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import { TestSession } from '../../types/testSession';
import { Scale, Play, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (session: TestSession) => void;
  preselectedInstrumentId?: string;
}

export const NewTestSessionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSessionCreated,
  preselectedInstrumentId,
}) => {
  const { currentUser, availableUsers } = useAuth();
  const [instruments, setInstruments] = useState(() => db.getInstruments());
  const technicians = availableUsers.filter((u) => u.role === 'LAB_TECHNICIAN' || u.role === 'ADMIN');
  const defaultTechId = currentUser.role === 'LAB_TECHNICIAN' 
    ? currentUser.id 
    : (technicians[0]?.id || currentUser.id);

  const [selectedInstId, setSelectedInstId] = useState(preselectedInstrumentId || '');
  const [selectedTechId, setSelectedTechId] = useState(defaultTechId);
  const [sessionNotes, setSessionNotes] = useState('');

  // Whenever the modal opens or the preselectedInstrumentId changes, refresh instruments and synchronize selection
  useEffect(() => {
    if (!isOpen) return;

    const freshInstruments = db.getInstruments();
    setInstruments(freshInstruments);

    // 1. If a preselected instrument ID is provided and exists in repository, select it
    if (preselectedInstrumentId && freshInstruments.some((i) => i.id === preselectedInstrumentId)) {
      setSelectedInstId(preselectedInstrumentId);
    } 
    // 2. Otherwise default to the first available instrument if current selection is invalid or empty
    else if (!selectedInstId || !freshInstruments.some((i) => i.id === selectedInstId)) {
      setSelectedInstId(freshInstruments[0]?.id || '');
    }

    // Default assigned technician
    if (!selectedTechId || !availableUsers.some((u) => u.id === selectedTechId)) {
      setSelectedTechId(defaultTechId);
    }
  }, [isOpen, preselectedInstrumentId, defaultTechId]);

  const selectedInst = instruments.find((i) => i.id === selectedInstId);
  const selectedTech = availableUsers.find((u) => u.id === selectedTechId) || currentUser;

  const handleStart = () => {
    if (!selectedInstId) return;
    const session = db.createTestSession(selectedInstId, currentUser, selectedTech);
    onSessionCreated(session);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start New NAWI Physical Test Session"
      subtitle="Initialize verification protocol under OIML R 76-1:2006 (E)"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        <div>
          <label className="text-slate-700 font-bold block mb-1">Select Instrument Under Test *</label>
          {instruments.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-amber-600" />
              <span>No weighing instruments registered. Please register an instrument first.</span>
            </div>
          ) : (
            <select
              id="select-instrument-under-test"
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {instruments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.instrumentIdTag} — {inst.manufacturer} {inst.model} (Max: {inst.maxCapacity} {inst.unit}, e={inst.verificationScaleInterval} {inst.unit})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedInst && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>{selectedInst.manufacturer} {selectedInst.model}</span>
              <span className="font-mono text-indigo-700">{selectedInst.instrumentIdTag}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
              <div>Class: <strong>{selectedInst.accuracyClass.replace('_', ' ')}</strong></div>
              <div>Max: <strong>{selectedInst.maxCapacity} {selectedInst.unit}</strong></div>
              <div>e: <strong>{selectedInst.verificationScaleInterval} {selectedInst.unit}</strong></div>
            </div>
          </div>
        )}

        <div>
          <label className="text-slate-700 font-bold block mb-1">Assigned Testing Technician (Testing Officer) *</label>
          <select
            value={selectedTechId}
            onChange={(e) => setSelectedTechId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
          >
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} — {u.designation} ({u.role.replace('_', ' ')})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 mt-1">
            The legal metrology officer actively recording observations on the test bench.
          </p>
        </div>

        <div>
          <label className="text-slate-700 font-bold block mb-1">Governing Standard Edition</label>
          <input
            type="text"
            readOnly
            value="OIML R 76-1:2006 (E)"
            className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 font-semibold"
          />
        </div>

        <div>
          <label className="text-slate-700 font-bold block mb-1">Session Notes (Optional)</label>
          <textarea
            rows={2}
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="e.g. Ambient conditions stable, standard weight set calibrated."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-start-session"
            onClick={handleStart}
            disabled={!selectedInstId}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <Play size={14} /> Start Test Protocol
          </button>
        </div>
      </div>
    </Modal>
  );
};
