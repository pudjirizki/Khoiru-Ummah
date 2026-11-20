import type ExcelJS from 'exceljs';
import {
  createClassReportFileName,
  createReportFileName,
  formatReportDate,
  ReportItem,
  ReportStudent,
} from './report-data';

const escapeHtml = (value: string | number | null | undefined): string =>
  String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderTableHtml = (titleHeader: string, items: ReportItem[]): string => {
  const rowsHtml = items
    .map(
      (item) => `
        <tr>
          <td class="td-no">${item.no}.</td>
          <td class="td-item">${escapeHtml(item.label)}</td>
          <td class="td-score">${item.score !== null && item.score !== undefined ? escapeHtml(item.score) : '-'}</td>
          <td class="td-letter">${escapeHtml(item.letter || '-')}</td>
        </tr>`
    )
    .join('');

  return `
    <table class="report-table">
      <thead>
        <tr>
          <th rowspan="2" class="th-no">No.</th>
          <th rowspan="2" class="th-item">${escapeHtml(titleHeader)}</th>
          <th colspan="2" class="th-grade">Penilaian</th>
        </tr>
        <tr>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>`;
};

const renderReportPage = (report: ReportStudent): string => {
  const displayClassSemester = `${escapeHtml(report.className)}/${escapeHtml(report.semester)}`;
  const displayDateAndPlace = report.dateAndPlace || formatReportDate();

  return `
    <article class="report-page">
      <header class="header-container">
        <div class="header-grid">
          <div class="identity-item">
            <span class="label">Nama Siswa</span>
            <span class="colon">:</span>
            <span class="val">${escapeHtml(report.name)}</span>
          </div>
          <div class="identity-item">
            <span class="label">Tahun Pelajaran</span>
            <span class="colon">:</span>
            <span class="val">${escapeHtml(report.academicYear)}</span>
          </div>
          <div class="identity-item">
            <span class="label">No. Induk Siswa</span>
            <span class="colon">:</span>
            <span class="val">${escapeHtml(report.identityNumber)}</span>
          </div>
          <div class="identity-item">
            <span class="label">Kelas/Semester</span>
            <span class="colon">:</span>
            <span class="val">${displayClassSemester}</span>
          </div>
        </div>
      </header>

      <div class="title-section">
        <h2>${escapeHtml(report.title || 'SIKAP DAN PERILAKU SISWA')}</h2>
      </div>

      <div class="tables-section">
        <div class="table-block">
          ${renderTableHtml('Sikap', report.sikapItems)}
        </div>

        <div class="table-block table-block-second">
          ${renderTableHtml('Perilaku / AL BIAH KU', report.perilakuItems)}
        </div>
      </div>

      <footer class="footer-container">
        <div class="date-line">${escapeHtml(displayDateAndPlace)}</div>
        <div class="mengetahui-line">Mengetahui</div>
        <div class="signatures-grid">
          <div class="sig-col">
            <div class="sig-role">Orang Tua / Wali Siswa</div>
            <div class="sig-space"></div>
            <div class="sig-name">(……………………………)</div>
          </div>
          <div class="sig-col">
            <div class="sig-role">Kepala Sekolah,</div>
            <div class="sig-space"></div>
            <div class="sig-name">(……………………………)</div>
          </div>
          <div class="sig-col">
            <div class="sig-role">Wali Kelas,</div>
            <div class="sig-space"></div>
            <div class="sig-name">(……………………………)</div>
          </div>
        </div>
      </footer>
    </article>`;
};

const createPrintableDocumentStart = (title: string): string => `<!doctype html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 15mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          color: #111827;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          font-size: 8.5pt;
          line-height: 1.25;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .report-page {
          width: 100%;
          min-height: 270mm;
          max-height: 277mm;
          break-after: page;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .report-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
        .header-container {
          margin-bottom: 8px;
        }
        .header-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 24px;
          row-gap: 4px;
          font-size: 8.5pt;
        }
        .identity-item {
          display: flex;
          align-items: baseline;
        }
        .identity-item .label {
          width: 110px;
          flex-shrink: 0;
          font-weight: 400;
        }
        .identity-item .colon {
          width: 14px;
          flex-shrink: 0;
        }
        .identity-item .val {
          flex: 1;
          font-weight: 400;
        }
        .title-section {
          text-align: center;
          margin: 4px 0 8px 0;
        }
        .title-section h2 {
          margin: 0;
          font-size: 10pt;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .tables-section {
          flex: 1;
        }
        .table-block {
          width: 100%;
        }
        .table-block-second {
          margin-top: -1px;
        }
        table.report-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 8pt;
        }
        table.report-table th,
        table.report-table td {
          border: 1px solid #374151;
          padding: 2.5px 4px;
          vertical-align: middle;
        }
        table.report-table thead th {
          background-color: #f1f5f9;
          font-weight: 700;
          text-align: center;
        }
        th.th-no {
          width: 32px;
          text-align: center;
        }
        th.th-item {
          text-align: center;
        }
        th.th-grade {
          width: 110px;
          text-align: center;
        }
        th.th-sub {
          width: 55px;
          text-align: center;
        }
        td.td-no {
          text-align: center;
          font-size: 8pt;
        }
        td.td-item {
          text-align: left;
          padding-left: 6px;
        }
        td.td-score {
          text-align: center;
        }
        td.td-letter {
          text-align: center;
        }
        .footer-container {
          margin-top: 10px;
          font-size: 8.5pt;
        }
        .date-line {
          text-align: right;
          margin-bottom: 4px;
          padding-right: 15px;
        }
        .mengetahui-line {
          text-align: center;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          text-align: center;
        }
        .sig-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          min-height: 24mm;
        }
        .sig-role {
          font-weight: 600;
        }
        .sig-space {
          flex: 1;
          min-height: 14mm;
        }
        .sig-name {
          font-weight: 400;
          letter-spacing: -0.5px;
        }
        @media screen {
          body {
            background: #e2e8f0;
            padding: 16px;
          }
          .report-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto 16px;
            padding: 12mm 16mm;
            background: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
        }
      </style>
    </head>
    <body>`;

const createPrintableDocumentTitle = (reports: ReportStudent[]): string =>
  reports.length === 1 ? createReportFileName(reports[0]) : createClassReportFileName(reports[0]?.className ?? '-');

export const createPrintableReportHtml = (reports: ReportStudent[]): string =>
  `${createPrintableDocumentStart(createPrintableDocumentTitle(reports))}${reports.map(renderReportPage).join('')}</body></html>`;

export const printReports = async (reports: ReportStudent[]): Promise<void> => {
  if (reports.length === 0) throw new Error('Tidak ada data siswa untuk diekspor.');

  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Jendela cetak diblokir browser. Izinkan pop-up lalu coba lagi.');

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(createPrintableDocumentStart(createPrintableDocumentTitle(reports)));
  for (let index = 0; index < reports.length; index += 10) {
    printWindow.document.write(reports.slice(index, index + 10).map(renderReportPage).join(''));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  window.setTimeout(() => printWindow.print(), 350);
};

const worksheetName = (name: string, index: number, used: Set<string>): string => {
  const base = name.replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31) || `Siswa ${index + 1}`;
  let candidate = base;
  let suffix = 2;

  while (used.has(candidate.toLowerCase())) {
    const tail = ` (${suffix})`;
    candidate = `${base.slice(0, 31 - tail.length)}${tail}`;
    suffix += 1;
  }

  used.add(candidate.toLowerCase());
  return candidate;
};

const thinBorder = {
  top: { style: 'thin' as const, color: { argb: 'FF374151' } },
  left: { style: 'thin' as const, color: { argb: 'FF374151' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF374151' } },
  right: { style: 'thin' as const, color: { argb: 'FF374151' } },
};

const styleTableCells = (row: ExcelJS.Row, colFrom: number, colTo: number) => {
  for (let c = colFrom; c <= colTo; c += 1) {
    const cell = row.getCell(c);
    cell.border = thinBorder;
  }
};

const addStudentWorksheet = (workbook: ExcelJS.Workbook, report: ReportStudent, index: number, names: Set<string>) => {
  const sheet = workbook.addWorksheet(worksheetName(report.name, index, names));

  // Columns: A: No (5), B: Sikap/Perilaku (45), C: Angka (11), D: Huruf (11)
  sheet.columns = [
    { width: 6 },
    { width: 48 },
    { width: 12 },
    { width: 12 },
  ];

  // 1. Header Identity
  // Row 1
  sheet.getCell('A1').value = 'Nama Siswa';
  sheet.getCell('A1').font = { bold: false, size: 10 };
  sheet.getCell('B1').value = `: ${report.name}`;
  sheet.getCell('B1').font = { size: 10 };
  sheet.getCell('C1').value = 'Tahun Pelajaran';
  sheet.getCell('C1').font = { bold: false, size: 10 };
  sheet.getCell('D1').value = `: ${report.academicYear}`;
  sheet.getCell('D1').font = { size: 10 };

  // Row 2
  sheet.getCell('A2').value = 'No. Induk Siswa';
  sheet.getCell('A2').font = { bold: false, size: 10 };
  sheet.getCell('B2').value = `: ${report.identityNumber}`;
  sheet.getCell('B2').font = { size: 10 };
  sheet.getCell('C2').value = 'Kelas/Semester';
  sheet.getCell('C2').font = { bold: false, size: 10 };
  sheet.getCell('D2').value = `: ${report.className}/${report.semester}`;
  sheet.getCell('D2').font = { size: 10 };

  // 2. Title: SIKAP DAN PERILAKU SISWA
  sheet.mergeCells('A4:D4');
  const titleCell = sheet.getCell('A4');
  titleCell.value = report.title || 'SIKAP DAN PERILAKU SISWA';
  titleCell.font = { bold: true, size: 11 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  let currentRow = 6;

  // Helper to render a table in Excel
  const renderTableExcel = (headerTitle: string, items: ReportItem[]) => {
    // Header Row 1
    sheet.mergeCells(`A${currentRow}:A${currentRow + 1}`);
    sheet.mergeCells(`B${currentRow}:B${currentRow + 1}`);
    sheet.mergeCells(`C${currentRow}:D${currentRow}`);

    const cellNo = sheet.getCell(`A${currentRow}`);
    cellNo.value = 'No.';
    cellNo.alignment = { horizontal: 'center', vertical: 'middle' };
    cellNo.font = { bold: true };

    const cellTitle = sheet.getCell(`B${currentRow}`);
    cellTitle.value = headerTitle;
    cellTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    cellTitle.font = { bold: true };

    const cellGrade = sheet.getCell(`C${currentRow}`);
    cellGrade.value = 'Penilaian';
    cellGrade.alignment = { horizontal: 'center', vertical: 'middle' };
    cellGrade.font = { bold: true };

    // Header Row 2
    const cellAngka = sheet.getCell(`C${currentRow + 1}`);
    cellAngka.value = 'Angka';
    cellAngka.alignment = { horizontal: 'center', vertical: 'middle' };
    cellAngka.font = { bold: true };

    const cellHuruf = sheet.getCell(`D${currentRow + 1}`);
    cellHuruf.value = 'Huruf';
    cellHuruf.alignment = { horizontal: 'center', vertical: 'middle' };
    cellHuruf.font = { bold: true };

    // Style headers
    [currentRow, currentRow + 1].forEach((rNum) => {
      const r = sheet.getRow(rNum);
      styleTableCells(r, 1, 4);
      for (let c = 1; c <= 4; c += 1) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      }
    });

    currentRow += 2;

    // Data rows
    items.forEach((item) => {
      const r = sheet.getRow(currentRow);
      r.getCell(1).value = `${item.no}.`;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(2).value = item.label;
      r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

      r.getCell(3).value = item.score !== null && item.score !== undefined ? item.score : '-';
      r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      if (item.score !== null && item.score !== undefined) {
        r.getCell(3).numFmt = '0';
      }

      r.getCell(4).value = item.letter || '-';
      r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

      styleTableCells(r, 1, 4);
      currentRow += 1;
    });
  };

  // Table 1: Sikap
  renderTableExcel('Sikap', report.sikapItems);

  // Table 2: Perilaku / AL BIAH KU (directly attached without gap, as in the user's template)
  renderTableExcel('Perilaku / AL BIAH KU', report.perilakuItems);

  currentRow += 1;

  // 3. Footer / Signatures
  // Place & Date
  sheet.mergeCells(`C${currentRow}:D${currentRow}`);
  const dateCell = sheet.getCell(`C${currentRow}`);
  dateCell.value = report.dateAndPlace || formatReportDate();
  dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
  currentRow += 1;

  // Mengetahui
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const mengetCell = sheet.getCell(`A${currentRow}`);
  mengetCell.value = 'Mengetahui';
  mengetCell.font = { bold: true };
  mengetCell.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow += 1;

  // Signer roles
  const sigRow = currentRow;
  sheet.getCell(`A${sigRow}`).value = 'Orang Tua / Wali Siswa';
  sheet.getCell(`A${sigRow}`).font = { bold: true };
  sheet.getCell(`A${sigRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`B${sigRow}:C${sigRow}`);
  sheet.getCell(`B${sigRow}`).value = 'Kepala Sekolah,';
  sheet.getCell(`B${sigRow}`).font = { bold: true };
  sheet.getCell(`B${sigRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.getCell(`D${sigRow}`).value = 'Wali Kelas,';
  sheet.getCell(`D${sigRow}`).font = { bold: true };
  sheet.getCell(`D${sigRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  currentRow += 4;

  // Signer dotted line / names
  const nameRow = currentRow;
  sheet.getCell(`A${nameRow}`).value = '(……………………………)';
  sheet.getCell(`A${nameRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`B${nameRow}:C${nameRow}`);
  sheet.getCell(`B${nameRow}`).value = '(……………………………)';
  sheet.getCell(`B${nameRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.getCell(`D${nameRow}`).value = '(……………………………)';
  sheet.getCell(`D${nameRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Page setup: Fit neatly on 1 A4 portrait page
  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  sheet.views = [{ state: 'normal', showGridLines: true }];
};

export const downloadExcelReports = async (reports: ReportStudent[]): Promise<void> => {
  if (reports.length === 0) throw new Error('Tidak ada data siswa untuk diekspor.');

  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'Khoiru Ummah';
  workbook.created = new Date();
  const names = new Set<string>();

  for (let index = 0; index < reports.length; index += 1) {
    addStudentWorksheet(workbook, reports[index], index, names);
    if ((index + 1) % 20 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }

  const fileName =
    reports.length === 1 ? `${createReportFileName(reports[0])}.xlsx` : `${createClassReportFileName(reports[0].className)}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
