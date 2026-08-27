import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { TestReport } from '../../types/report';
import { Laboratory } from '../../types/user';

export async function generateTestReportDOCX(report: TestReport, lab: Laboratory): Promise<void> {
  const inst = report.instrumentSnapshot;
  const session = report.testSessionSnapshot;

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: lab.name.toUpperCase(),
                bold: true,
                size: 28,
                color: '0F172A',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${lab.legalAddress}, ${lab.city}, ${lab.country} | Accreditation: ${lab.accreditationNumber}`,
                size: 18,
                color: '64748B',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: `LEGAL METROLOGY NAWI TEST REPORT (${report.standardEdition})`,
                bold: true,
                size: 24,
                color: '1E293B',
              }),
            ],
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Report Number:', bold: true }), new TextRun(` ${report.reportNumber}`)] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Revision:', bold: true }), new TextRun(` ${report.currentRevision}`)] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true }), new TextRun(` ${new Date(report.generatedAt).toLocaleDateString()}`)] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // Section 1: Instrument Specifications
          new Paragraph({
            text: '1. Instrument Under Test Specifications',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Manufacturer: ', bold: true }), new TextRun(inst.manufacturer)] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Model: ', bold: true }), new TextRun(`${inst.model} (${inst.instrumentType})`)] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Serial Number: ', bold: true }), new TextRun(inst.serialNumber)] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Accuracy Class: ', bold: true }), new TextRun(`Class ${inst.accuracyClass.replace('_', ' ')}`)] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Max Capacity: ', bold: true }), new TextRun(`${inst.maxCapacity} ${inst.unit}`)] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Min Capacity: ', bold: true }), new TextRun(`${inst.minCapacity} ${inst.unit}`)] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Interval e: ', bold: true }), new TextRun(`${inst.verificationScaleInterval} ${inst.unit}`)] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Actual Interval d: ', bold: true }), new TextRun(`${inst.actualScaleInterval} ${inst.unit} (n = ${inst.numberOfIntervals.toLocaleString()})`)] })] }),
                ],
              }),
            ],
          }),

          // Section 2: Weighing Test Table
          new Paragraph({
            text: '2. Weighing Performance Test Results (OIML R 76-1 Clause 3.5.1 & A.4.4.3)',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Dir', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Load (${inst.unit})`, bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Ind (${inst.unit})`, bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Ec (${inst.unit})`, bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'MPE', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Result', bold: true })] })] }),
                ],
              }),
              ...(session.weighingObservations || []).map(
                (obs) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(String(obs.testPointIndex))] }),
                      new TableCell({ children: [new Paragraph(obs.direction === 'ASCENDING' ? 'Asc' : 'Desc')] }),
                      new TableCell({ children: [new Paragraph(String(obs.nominalLoad))] }),
                      new TableCell({ children: [new Paragraph(String(obs.indicatedValue))] }),
                      new TableCell({ children: [new Paragraph(obs.correctedErrorEc !== undefined ? obs.correctedErrorEc.toFixed(4) : '-')] }),
                      new TableCell({ children: [new Paragraph(obs.mpeInUnit !== undefined ? `±${obs.mpeInUnit.toFixed(4)}` : `±${obs.mpeE}e`)] }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: obs.compliance,
                                bold: true,
                                color: obs.compliance === 'PASS' ? '166534' : '991B1B',
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  })
              ),
            ],
          }),

          // Compliance Determination Box
          new Paragraph({
            text: '3. Legal Metrology Compliance Determination',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `OVERALL RESULT: ${report.overallCompliance}\n`,
                bold: true,
                size: 24,
                color: report.overallCompliance === 'PASS' ? '166534' : '991B1B',
              }),
              new TextRun({
                text: report.complianceStatement,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          // Sign-off
          new Paragraph({
            children: [
              new TextRun({ text: `Testing Technician: ${report.technicianName} (Signed: ${new Date(report.technicianSignedAt || report.generatedAt).toLocaleString()})\n`, bold: true }),
              new TextRun({ text: `Authorized Reviewer: ${report.reviewerName} (Approved: ${new Date(report.reviewerSignedAt || report.generatedAt).toLocaleString()})\n`, bold: true }),
              new TextRun({ text: `SHA-256 Verification Hash: ${report.sha256IntegrityHash}`, size: 16, color: '64748B' }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.reportNumber}_Rev${report.currentRevision}.docx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
