import React, { useState } from 'react';
import { db } from '../../services/storage/database';
import { BookOpen, Search, ShieldCheck, CheckCircle2, ChevronRight, Layers, Table } from 'lucide-react';
import { MetrologyRule } from '../../metrology/rules/ruleTypes';

export const StandardsRuleView: React.FC = () => {
  const rules = db.getMetrologyRules();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRule, setSelectedRule] = useState<MetrologyRule | null>(rules[0] || null);

  const filteredRules = rules.filter((r) => {
    return (
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clauseRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div id="standards-rules-view" className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen size={22} className="text-indigo-600" />
            OIML R 76-1:2006 Rule Registry & Standard Tables
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Governing legal metrology clauses, Table 3 accuracy limits, Table 6 MPE envelopes, and decision rules
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search clause, rule title, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Standard Edition:</span>
          <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
            OIML R 76-1:2006 (E)
          </span>
        </div>
      </div>

      {/* Two Column Layout: Rule List & Rule Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Sidebar List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
          {filteredRules.map((rule) => {
            const isSelected = selectedRule?.ruleId === rule.ruleId;
            return (
              <button
                key={rule.ruleId}
                onClick={() => setSelectedRule(rule)}
                className={`w-full text-left p-4 transition-colors flex items-start justify-between gap-3 ${
                  isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {rule.clauseRef}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      VERIFIED
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{rule.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{rule.description}</p>
                </div>
                <ChevronRight size={16} className={`shrink-0 mt-1 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>

        {/* Rule Detailed Spec Inspector */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRule ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {selectedRule.clauseRef}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">ID: {selectedRule.ruleId}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{selectedRule.title}</h3>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                  <ShieldCheck size={14} /> Formal Metrology Verified Rule
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Metrological Description</h5>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedRule.description}
                </p>
              </div>

              {/* Applicable Classes */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Applicable Accuracy Classes</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedRule.applicableClasses.map((cls) => (
                    <span
                      key={cls}
                      className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200"
                    >
                      {cls.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Decision Criteria & Logic */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mathematical Decision Rule</h5>
                <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto">
                  {selectedRule.decisionCriteria}
                </div>
              </div>

              {/* Parameters Breakdown */}
              {selectedRule.parameters && Object.keys(selectedRule.parameters).length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Governing Parameters</h5>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 pl-3 font-semibold">Parameter</th>
                          <th className="p-2.5 pr-3 font-semibold">Value / Limit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-xs">
                        {Object.entries(selectedRule.parameters).map(([key, val]) => (
                          <tr key={key}>
                            <td className="p-2.5 pl-3 font-sans text-slate-700">{key}</td>
                            <td className="p-2.5 pr-3 text-slate-900 font-bold">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Reference */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Standard: <strong>{selectedRule.standard} ({selectedRule.edition})</strong></span>
                <span>Source: <strong>{selectedRule.sourceReference}</strong></span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Select a rule from the left panel to inspect its metrological parameters.
            </div>
          )}

          {/* OIML Table 6 Reference Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Table size={15} className="text-indigo-600" />
              OIML R 76-1 Table 6: Maximum Permissible Errors on Initial Verification
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-2">MPE on Verification</th>
                    <th className="p-2">Class I (Special)</th>
                    <th className="p-2">Class II (High)</th>
                    <th className="p-2">Class III (Medium)</th>
                    <th className="p-2">Class IIII (Ordinary)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs text-slate-800">
                  <tr>
                    <td className="p-2 font-bold text-indigo-700">± 0.5 e</td>
                    <td className="p-2">0 ≤ m ≤ 50 000</td>
                    <td className="p-2">0 ≤ m ≤ 5 000</td>
                    <td className="p-2">0 ≤ m ≤ 500</td>
                    <td className="p-2">0 ≤ m ≤ 50</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-2 font-bold text-indigo-700">± 1.0 e</td>
                    <td className="p-2">50 000 &lt; m ≤ 200 000</td>
                    <td className="p-2">5 000 &lt; m ≤ 20 000</td>
                    <td className="p-2">500 &lt; m ≤ 2 000</td>
                    <td className="p-2">50 &lt; m ≤ 200</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-indigo-700">± 1.5 e</td>
                    <td className="p-2">m &gt; 200 000</td>
                    <td className="p-2">m &gt; 20 000</td>
                    <td className="p-2">2 000 &lt; m ≤ 10 000</td>
                    <td className="p-2">200 &lt; m ≤ 1 000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 italic mt-2">
              Note: Clause 3.5.2 specifies that for service verification (in-service inspection), MPE values are multiplied by 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
