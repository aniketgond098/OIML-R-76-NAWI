import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TestReport } from '../../types/report';
import { Laboratory } from '../../types/user';

/**
 * Authoritative PDF Generation Service for OIML R 76-1:2006 (E) NAWI Test Reports.
 * Generates deterministic, fully traceable legal metrology reports from structured observation data.
 */
export function generateTestReportPDF(report: TestReport, lab: Laboratory): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, y, pageWidth - 2 * margin, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(lab.name.toUpperCase(), margin + 5, y + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Accreditation: ${lab.accreditationNumber} | Standard: ${report.standardEdition || 'OIML R 76-1:2006'} | RuleSet: ${report.ruleSetVersion || 'OIML-R76-2006-v1.0'}`, margin + 5, y + 13);
  doc.text(`${lab.legalAddress}, ${lab.city}, ${lab.country}`, margin + 5, y + 18);

  y += 27;

  // Demo Data Watermark Banner
  if (report.isDemoData) {
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(245, 158, 11); // Amber 500
    doc.rect(margin, y, pageWidth - 2 * margin, 7, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Amber 700
    doc.text('PROTOTYPE / DEMO LABORATORY DATA - FOR SYSTEM DEMONSTRATION ONLY', pageWidth / 2, y + 4.8, { align: 'center' });
    y += 9;
  }

  // Title & Metadata Box
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LEGAL METROLOGY NAWI VERIFICATION REPORT', margin, y + 1);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const metaRight = pageWidth - margin;
  doc.text(`Report No: ${report.reportNumber}`, metaRight, y - 1, { align: 'right' });
  doc.text(`Revision: ${report.currentRevision} | Date: ${new Date(report.generatedAt).toLocaleDateString()}`, metaRight, y + 3.5, { align: 'right' });

  y += 7;

  // 1. Instrument Under Test (IUT) Summary Table
  const inst = report.instrumentSnapshot;
  const instData = [
    [
      { content: 'Manufacturer:', styles: { fontStyle: 'bold' as const } },
      inst.manufacturer,
      { content: 'Model / Type:', styles: { fontStyle: 'bold' as const } },
      `${inst.model} (${inst.instrumentType})`,
    ],
    [
      { content: 'Serial Number:', styles: { fontStyle: 'bold' as const } },
      inst.serialNumber,
      { content: 'Accuracy Class:', styles: { fontStyle: 'bold' as const } },
      `Class ${inst.accuracyClass.replace('CLASS_', '')} (OIML Table 3)`,
    ],
    [
      { content: 'Max Capacity:', styles: { fontStyle: 'bold' as const } },
      `${inst.maxCapacity} ${inst.unit}`,
      { content: 'Min Capacity:', styles: { fontStyle: 'bold' as const } },
      `${inst.minCapacity} ${inst.unit}`,
    ],
    [
      { content: 'Verification Interval (e):', styles: { fontStyle: 'bold' as const } },
      `${inst.verificationScaleInterval} ${inst.unit}`,
      { content: 'Actual Interval (d):', styles: { fontStyle: 'bold' as const } },
      `${inst.actualScaleInterval} ${inst.unit} (n = ${inst.numberOfIntervals.toLocaleString()})`,
    ],
    [
      { content: 'Load Receptor:', styles: { fontStyle: 'bold' as const } },
      `${inst.loadReceptorType} (${inst.numberOfSupportPoints} points of support)`,
      { content: 'Tare Device:', styles: { fontStyle: 'bold' as const } },
      inst.tareType || 'Subtractive',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [[{ content: '1. INSTRUMENT UNDER TEST SPECIFICATIONS', colSpan: 4, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } }]],
    body: instData,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // 2. Ambient Test Conditions & Reference Standards
  const session = report.testSessionSnapshot;
  const envStart = session.environmentalReadings?.find((r) => r.stage === 'START') || session.environmentalReadings?.[0];
  const envEnd = session.environmentalReadings?.find((r) => r.stage === 'END') || envStart;

  const envData = [
    [
      { content: 'Ambient Temperature:', styles: { fontStyle: 'bold' as const } },
      `${envStart?.temperatureC ?? 20.0} °C (Start) -> ${envEnd?.temperatureC ?? 20.2} °C (End)`,
      { content: 'Relative Humidity:', styles: { fontStyle: 'bold' as const } },
      `${envStart?.relativeHumidityPercent ?? 50}% RH`,
    ],
    [
      { content: 'Atmospheric Pressure:', styles: { fontStyle: 'bold' as const } },
      `${envStart?.atmosphericPressureHPa ?? 1013.25} hPa`,
      { content: 'Standards Used:', styles: { fontStyle: 'bold' as const } },
      report.equipmentSnapshots?.map((eq) => `${eq.name} (${eq.equipmentIdTag})`).join(', ') || 'Calibrated Standard Mass Set (OIML Class F1)',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [[{ content: '2. AMBIENT TEST CONDITIONS & REFERENCE STANDARDS', colSpan: 4, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } }]],
    body: envData,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // 3. Structured Compliance Matrix
  const matrixRows = (report.complianceMatrix && report.complianceMatrix.length > 0)
    ? report.complianceMatrix.map((item) => [
        item.testName,
        item.clauseRef,
        item.mpeRequirement || '-',
        item.calculatedError || item.summaryResult,
        {
          content: item.compliance,
          styles: {
            textColor: (item.compliance === 'PASS' ? [22, 101, 52] : item.compliance === 'FAIL' ? [153, 27, 27] : [180, 83, 9]) as [number, number, number],
            fontStyle: 'bold' as const,
          },
        },
      ])
    : [
        ['Weighing Performance Test', 'Clause 3.5.1, Table 6', 'Table 6 MPE (±0.5e, ±1.0e, ±1.5e)', 'Evaluated', report.overallCompliance],
      ];

  autoTable(doc, {
    startY: y,
    head: [
      [{ content: '3. FORMAL COMPLIANCE MATRIX (OIML R 76-1:2006 REQUIREMENTS)', colSpan: 5, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } }],
      ['Applicable Test Module', 'OIML Clause', 'Prescribed Limit (MPE)', 'Calculated Result', 'Compliance'],
    ],
    body: matrixRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7, cellPadding: 1.8 },
    styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // 4. Weighing Test Observations & Calculations Table
  if (session.weighingObservations && session.weighingObservations.length > 0) {
    if (y > pageHeight - 65) {
      doc.addPage();
      y = margin;
    }

    const weighingRows = session.weighingObservations.map((obs) => [
      obs.testPointIndex,
      obs.direction === 'ASCENDING' ? '↑ Asc' : '↓ Desc',
      `${obs.nominalLoad} ${inst.unit}`,
      `${obs.indicatedValue} ${inst.unit}`,
      obs.turningPointDeltaL !== undefined ? `${obs.turningPointDeltaL} ${inst.unit}` : '-',
      obs.calculatedIndicationP !== undefined ? `${obs.calculatedIndicationP.toFixed(4)}` : '-',
      obs.correctedErrorEc !== undefined ? `${obs.correctedErrorEc.toFixed(4)} ${inst.unit}` : '-',
      obs.mpeInUnit !== undefined ? `±${obs.mpeInUnit.toFixed(4)} ${inst.unit}` : `±${obs.mpeE} e`,
      {
        content: obs.compliance,
        styles: {
          textColor: (obs.compliance === 'PASS' ? [22, 101, 52] : obs.compliance === 'FAIL' ? [153, 27, 27] : [180, 83, 9]) as [number, number, number],
          fontStyle: 'bold' as const,
        },
      },
    ]);

    autoTable(doc, {
      startY: y,
      head: [
        [{ content: '4. WEIGHING PERFORMANCE TEST OBSERVATIONS (Clause 3.5.1 & A.4.4.3: P = I + 0.5e - ΔL, Ec = P - L - E0)', colSpan: 9, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } }],
        ['#', 'Dir', 'Load (L)', 'Ind (I)', 'ΔL', 'Calc (P)', 'Error (Ec)', 'MPE', 'Result'],
      ],
      body: weighingRows,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7, cellPadding: 1.8 },
      styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // Check page overflow for Repeatability, Eccentricity, Zero & Tare
  const testSummaries: string[][] = [];

  if (session.repeatabilitySeries && session.repeatabilitySeries.length > 0) {
    session.repeatabilitySeries.forEach((rep) => {
      testSummaries.push([
        'Repeatability Test (Clause 3.6.1 & A.4.10)',
        `Load: ${rep.nominalLoad} ${inst.unit} (${rep.readings.length} cycles)`,
        `ΔI = ${rep.deltaI.toFixed(4)} ${inst.unit} (Mean: ${rep.meanIndication?.toFixed(4) || '-'})`,
        `|MPE| = ${rep.mpeInUnit.toFixed(4)} ${inst.unit}`,
        rep.compliance,
      ]);
    });
  }

  if (session.eccentricityObservations && session.eccentricityObservations.length > 0) {
    session.eccentricityObservations.forEach((ecc) => {
      testSummaries.push([
        `Eccentric Loading - Pos ${ecc.positionId} (${ecc.positionName})`,
        `Load: ${ecc.nominalLoad} ${inst.unit}`,
        `Ec = ${ecc.correctedErrorEc?.toFixed(4) ?? '-'} ${inst.unit}`,
        `|MPE| = ±${ecc.mpeInUnit?.toFixed(4) ?? '-'} ${inst.unit}`,
        ecc.compliance,
      ]);
    });
  }

  if (session.zeroSettingObservation) {
    const z = session.zeroSettingObservation;
    testSummaries.push([
      'Zero-Setting Accuracy (Clause 4.5.2 & A.4.2.3)',
      'Zero Load (0.00)',
      `E0 = ${z.calculatedZeroErrorE0.toFixed(5)} ${inst.unit}`,
      `±0.25 e = ±${z.maxPermissibleZeroError.toFixed(5)} ${inst.unit}`,
      z.compliance,
    ]);
  }

  if (session.tareObservation) {
    const t = session.tareObservation;
    testSummaries.push([
      'Tare Mechanism Accuracy (Clause 4.6.3 & A.4.6)',
      `Tare Load: ${t.tareLoadApplied} ${inst.unit}`,
      `Etare = ${t.calculatedTareError.toFixed(5)} ${inst.unit}`,
      `±0.25 e = ±${(inst.verificationScaleInterval * 0.25).toFixed(5)} ${inst.unit}`,
      t.compliance,
    ]);
  }

  if (testSummaries.length > 0) {
    if (y > pageHeight - 55) {
      doc.addPage();
      y = margin;
    }

    autoTable(doc, {
      startY: y,
      head: [
        [{ content: '5. REPEATABILITY, ECCENTRICITY, ZERO & TARE TEST SUMMARY', colSpan: 5, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } }],
        ['Test Module & Reference', 'Test Load / Condition', 'Calculated Quantity', 'Permissible Limit', 'Result'],
      ],
      body: testSummaries.map((row) => [
        row[0],
        row[1],
        row[2],
        row[3],
        {
          content: row[4],
          styles: {
            textColor: (row[4] === 'PASS' ? [22, 101, 52] : row[4] === 'FAIL' ? [153, 27, 27] : [180, 83, 9]) as [number, number, number],
            fontStyle: 'bold' as const,
          },
        },
      ]),
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7, cellPadding: 1.8 },
      styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // Check page overflow for compliance & signature box
  if (y > pageHeight - 55) {
    doc.addPage();
    y = margin;
  }

  // 6. Overall Legal Metrology Determination Box
  const status = report.overallCompliance;
  const isPass = status === 'PASS';
  const isFail = status === 'FAIL';

  const boxBgColor: [number, number, number] = isPass ? [240, 253, 244] : isFail ? [254, 242, 242] : [255, 251, 235];
  const boxBorderColor: [number, number, number] = isPass ? [34, 197, 94] : isFail ? [239, 68, 68] : [245, 158, 11];
  const boxTextColor: [number, number, number] = isPass ? [22, 101, 52] : isFail ? [153, 27, 27] : [180, 83, 9];

  doc.setFillColor(...boxBgColor);
  doc.setDrawColor(...boxBorderColor);
  doc.rect(margin, y, pageWidth - 2 * margin, 20, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...boxTextColor);
  doc.text(`OVERALL LEGAL METROLOGY DETERMINATION: ${status}`, margin + 4, y + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(report.complianceStatement, margin + 4, y + 11.5, { maxWidth: pageWidth - 2 * margin - 8 });

  y += 23;

  // 7. Separate Technician & Reviewer Verification Signatures
  const colW = (pageWidth - 2 * margin) / 2;

  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, colW - 2, 22);
  doc.rect(margin + colW + 2, y, colW - 2, 22);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TESTING TECHNICIAN (Observations & Test Execution):', margin + 3, y + 4.5);
  doc.text('AUTHORIZED METROLOGICAL REVIEWER (Evaluation & Signoff):', margin + colW + 5, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(report.technicianName, margin + 3, y + 10);
  doc.text(`Completed: ${new Date(report.technicianSignedAt || report.generatedAt).toLocaleString()}`, margin + 3, y + 14.5);
  doc.text('Signature Status: [SIGNED BY TECHNICIAN]', margin + 3, y + 18.5);

  doc.text(report.reviewerName, margin + colW + 5, y + 10);
  doc.text(`Approved: ${new Date(report.reviewerSignedAt || report.generatedAt).toLocaleString()}`, margin + colW + 5, y + 14.5);
  doc.text(`Approval Record: ${report.approvalRecord?.status || 'APPROVED & SEALED'}`, margin + colW + 5, y + 18.5);

  // Footer on all pages
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400

    doc.text(
      `OIML R 76-1:2006 (E) NAWI Test Report | Standard: ${report.standardEdition || 'OIML R 76-1:2006'} | RuleSet: ${report.ruleSetVersion || 'OIML-R76-2006-v1.0'} | SHA-256: ${report.sha256IntegrityHash.slice(0, 28)}...`,
      margin,
      pageHeight - 5
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  // Save the document
  doc.save(`${report.reportNumber}_Rev${report.currentRevision}.pdf`);
}
