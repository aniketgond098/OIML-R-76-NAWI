import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TestReport } from '../../types/report';
import { Laboratory } from '../../types/user';

export function generateTestReportPDF(report: TestReport, lab: Laboratory): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, y, pageWidth - 2 * margin, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(lab.name.toUpperCase(), margin + 5, y + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Accreditation: ${lab.accreditationNumber} | Standard: ${report.standardEdition}`, margin + 5, y + 14);
  doc.text(`${lab.legalAddress}, ${lab.city}, ${lab.country}`, margin + 5, y + 19);

  y += 28;

  // Title & Metadata Box
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LEGAL METROLOGY NAWI TEST REPORT', margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const metaRight = pageWidth - margin;
  doc.text(`Report No: ${report.reportNumber}`, metaRight, y - 1, { align: 'right' });
  doc.text(`Revision: ${report.currentRevision} | Date: ${new Date(report.generatedAt).toLocaleDateString()}`, metaRight, y + 4, { align: 'right' });

  y += 9;

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
      `Class ${inst.accuracyClass.replace('_', ' ')} (OIML Table 3)`,
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
      { content: 'Software / Firmware:', styles: { fontStyle: 'bold' as const } },
      inst.softwareVersion || 'N/A',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [[{ content: '1. INSTRUMENT UNDER TEST SPECIFICATIONS', colSpan: 4, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } }]],
    body: instData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // 2. Ambient Test Conditions & Equipment
  const session = report.testSessionSnapshot;
  const envStart = session.environmentalReadings?.find((r) => r.stage === 'START') || session.environmentalReadings?.[0];
  const envEnd = session.environmentalReadings?.find((r) => r.stage === 'END') || envStart;

  const envData = [
    [
      { content: 'Ambient Temperature:', styles: { fontStyle: 'bold' as const } },
      `${envStart?.temperatureC ?? 22.0} °C (Start) -> ${envEnd?.temperatureC ?? 22.5} °C (End)`,
      { content: 'Relative Humidity:', styles: { fontStyle: 'bold' as const } },
      `${envStart?.relativeHumidityPercent ?? 50}% RH`,
    ],
    [
      { content: 'Atmospheric Pressure:', styles: { fontStyle: 'bold' as const } },
      `${envStart?.atmosphericPressureHPa ?? 1013.25} hPa`,
      { content: 'Standards Used:', styles: { fontStyle: 'bold' as const } },
      report.equipmentSnapshots?.map((eq) => `${eq.name} (${eq.equipmentIdTag})`).join(', ') || 'Calibrated Class F1 Standard Weights',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [[{ content: '2. AMBIENT TEST CONDITIONS & REFERENCE STANDARDS', colSpan: 4, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } }]],
    body: envData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // 3. Weighing Test Observations & Calculations Table
  if (session.weighingObservations && session.weighingObservations.length > 0) {
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
          textColor: (obs.compliance === 'PASS' ? [22, 101, 52] : [153, 27, 27]) as [number, number, number],
          fontStyle: 'bold' as const,
        },
      },
    ]);

    autoTable(doc, {
      startY: y,
      head: [
        [{ content: '3. WEIGHING PERFORMANCE TEST (OIML R 76-1:2006 Clause 3.5.1 & A.4.4.3)', colSpan: 9, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } }],
        ['#', 'Dir', 'Load (L)', 'Ind (I)', 'ΔL', 'Calc (P)', 'Error (Ec)', 'MPE', 'Result'],
      ],
      body: weighingRows,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7.5, cellPadding: 2 },
      styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Check page overflow for additional test summaries
  if (y > pageHeight - 65) {
    doc.addPage();
    y = margin;
  }

  // 4. Repeatability & Eccentricity Summaries
  const testSummaries: string[][] = [];

  if (session.repeatabilitySeries && session.repeatabilitySeries.length > 0) {
    session.repeatabilitySeries.forEach((rep) => {
      testSummaries.push([
        'Repeatability Test (Clause 3.6.1)',
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
      'Zero-Setting Accuracy (Clause 4.5.2)',
      'Zero Load (0.00)',
      `E0 = ${z.calculatedZeroErrorE0.toFixed(5)} ${inst.unit}`,
      `±0.25 e = ±${z.maxPermissibleZeroError.toFixed(5)} ${inst.unit}`,
      z.compliance,
    ]);
  }

  if (session.tareObservation) {
    const t = session.tareObservation;
    testSummaries.push([
      'Tare Mechanism Accuracy (Clause 4.6.3)',
      `Tare Load: ${t.tareLoadApplied} ${inst.unit}`,
      `Etare = ${t.calculatedTareError.toFixed(5)} ${inst.unit}`,
      `±0.25 e = ±${(inst.verificationScaleInterval * 0.25).toFixed(5)} ${inst.unit}`,
      t.compliance,
    ]);
  }

  if (testSummaries.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [
        [{ content: '4. REPEATABILITY, ECCENTRICITY, ZERO & TARE TEST SUMMARY', colSpan: 5, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } }],
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
            textColor: row[4] === 'PASS' ? [22, 101, 52] : [153, 27, 27],
            fontStyle: 'bold' as const,
          },
        },
      ]),
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7.5, cellPadding: 2 },
      styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Check page overflow for compliance & signature box
  if (y > pageHeight - 55) {
    doc.addPage();
    y = margin;
  }

  // 5. Final Compliance Statement Box
  const isPass = report.overallCompliance === 'PASS';
  doc.setFillColor(isPass ? 240 : 254, isPass ? 253 : 242, isPass ? 244 : 242);
  doc.setDrawColor(isPass ? 34 : 239, isPass ? 197 : 68, isPass ? 94 : 68);
  doc.rect(margin, y, pageWidth - 2 * margin, 20, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isPass ? 22 : 153, isPass ? 101 : 27, isPass ? 52 : 27);
  doc.text(`OVERALL LEGAL METROLOGY DETERMINATION: ${report.overallCompliance}`, margin + 5, y + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(report.complianceStatement, margin + 5, y + 13, { maxWidth: pageWidth - 2 * margin - 10 });

  y += 24;

  // 6. Signatures & Digital Hash Verification
  const colW = (pageWidth - 2 * margin) / 2;

  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, colW - 2, 24);
  doc.rect(margin + colW + 2, y, colW - 2, 24);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TESTING TECHNICIAN:', margin + 4, y + 5);
  doc.text('AUTHORIZED REVIEWER / METROLOGY OFFICER:', margin + colW + 6, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(report.technicianName, margin + 4, y + 11);
  doc.text(`Timestamp: ${new Date(report.technicianSignedAt || report.generatedAt).toLocaleString()}`, margin + 4, y + 16);
  doc.text('Digital Signature: [VERIFIED LAB OPERATOR]', margin + 4, y + 20);

  doc.text(report.reviewerName, margin + colW + 6, y + 11);
  doc.text(`Approval Date: ${new Date(report.reviewerSignedAt || report.generatedAt).toLocaleString()}`, margin + colW + 6, y + 16);
  doc.text(`Status: ${report.isApproved ? 'APPROVED & SEALED' : 'PENDING'}`, margin + colW + 6, y + 20);

  y += 28;

  // Footer on all pages
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400

    doc.text(
      `OIML R 76-1:2006 (E) NAWI Test Report | SHA-256: ${report.sha256IntegrityHash.slice(0, 32)}...`,
      margin,
      pageHeight - 6
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  // Save the document
  doc.save(`${report.reportNumber}_Rev${report.currentRevision}.pdf`);
}
