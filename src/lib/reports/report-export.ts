import type ExcelJS from 'exceljs';
import { createClassReportFileName, createReportFileName, ReportSection, ReportStudent, ReportTable } from './report-data';

const escapeHtml = (value: string | number): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const tableColumnCount = (table: ReportTable): number => 2 + (table.showKkm ? 1 : 0) + table.metrics.reduce((count, metric) => count + (metric.type === 'grade' ? 2 : 1), 0);

const renderTable = (table: ReportTable, startIndex: number): string => {
  const itemName = table.showKkm ? 'Mata Pelajaran' : 'Penilaian';
  let headings = '';
  let subheadings = '';
  let metricIndex = 0;

  while (metricIndex < table.metrics.length) {
    const metric = table.metrics[metricIndex];
    if (metric.group) {
      const groupedMetrics: typeof table.metrics = [];
      while (metricIndex < table.metrics.length && table.metrics[metricIndex].group === metric.group) {
        groupedMetrics.push(table.metrics[metricIndex]);
        metricIndex += 1;
      }
      const groupWidth = groupedMetrics.reduce((count, item) => count + (item.type === 'grade' ? 2 : 1), 0);
      headings += `<th colspan="${groupWidth}">${escapeHtml(metric.group)}</th>`;
      subheadings += groupedMetrics
        .map((item) => `<th colspan="${item.type === 'grade' ? 2 : 1}">${escapeHtml(item.label)}${item.type === 'grade' ? ' (Angka/Huruf)' : ''}</th>`)
        .join('');
      continue;
    }

    if (metric.type === 'grade') {
      headings += `<th colspan="2">${escapeHtml(metric.label)}</th>`;
      subheadings += '<th>Angka</th><th>Huruf</th>';
    } else {
      headings += `<th rowspan="2">${escapeHtml(metric.label)}</th>`;
    }
    metricIndex += 1;
  }

  const fixedHeaders = `<th rowspan="2" class="number">No.</th><th rowspan="2">${itemName}</th>${table.showKkm ? '<th rowspan="2">KKM</th>' : ''}`;
  const rows = table.rows
    .map((row, rowIndex) => {
      const values = table.metrics
        .map((metric, metricIndex) => {
          const value = row.values[metricIndex];
          if (metric.type === 'text') return `<td class="text-value">${escapeHtml(value?.text || '-')}</td>`;
          const belowKkm = value?.score !== null && value?.score !== undefined && row.kkm !== null && value.score < row.kkm;
          return `<td class="grade${belowKkm ? ' below-kkm' : ''}">${value?.score === null || value?.score === undefined ? '-' : escapeHtml(value.score)}</td><td class="grade">${escapeHtml(value?.letter || '-')}</td>`;
        })
        .join('');
      return `<tr><td class="number">${startIndex + rowIndex}</td><td>${escapeHtml(row.label)}</td>${table.showKkm ? `<td class="grade">${row.kkm === null ? '-' : escapeHtml(row.kkm)}</td>` : ''}${values}</tr>`;
    })
    .join('');

  return `
    <div class="table-block">
      ${table.title ? `<h3>${escapeHtml(table.title)}</h3>` : ''}
      <table>
        <thead><tr>${fixedHeaders}${headings}</tr><tr>${subheadings}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
};

const renderSectionsPage = (report: ReportStudent, sections: ReportSection[], pageNumber: number): string => {
  let rowIndex = 1;
  const body = sections
    .map((section) => {
      const tables = section.tables.map((table) => {
        const html = renderTable(table, rowIndex);
        rowIndex += table.rows.length;
        return html;
      });
      return `<section class="report-section"><h2>${escapeHtml(section.title)}</h2>${tables.join('')}</section>`;
    })
    .join('');

  return `
    <article class="report-page">
      ${pageNumber === 1 ? `<header>
        <div class="identity">
          <div><strong>Nama Siswa :</strong><span>${escapeHtml(report.name)}</span></div>
          <div><strong>Tahun Pelajaran :</strong><span>${escapeHtml(report.academicYear)}</span></div>
          <div><strong>Kelas/Semester :</strong><span>${escapeHtml(report.className)} / ${escapeHtml(report.semester)}</span></div>
          <div><strong>No. Induk :</strong><span>${escapeHtml(report.identityNumber)}</span></div>
        </div>
      </header>` : ''}
      ${body}
      ${pageNumber === 2 ? `<footer><p class="place-date">Kota, tanggal: -</p><div class="signatures"><div><span>Orang Tua/Wali Siswa</span><strong>( - )</strong></div><div><span>Kepala Sekolah</span><strong>( - )</strong></div><div><span>Wali Kelas</span><strong>( - )</strong></div></div></footer>` : ''}
    </article>`;
};

const renderReport = (report: ReportStudent): string => {
  const pageGroups = [
    report.sections.filter((section) => ['A.', 'B.', 'C.', 'D.'].some((prefix) => section.title.startsWith(prefix))),
    report.sections.filter((section) => ['E.', 'F.', 'G.', 'H.'].some((prefix) => section.title.startsWith(prefix))),
  ];

  return pageGroups.map((sections, index) => renderSectionsPage(report, sections, index + 1)).join('');
};

const createPrintableDocumentStart = (title: string): string => `<!doctype html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #17211b; font: 7pt Arial, sans-serif; }
        .report-page { width: 100%; min-height: 277mm; break-after: page; page-break-after: always; }
        .report-page:last-child { break-after: auto; page-break-after: auto; }
        .identity { display: grid; grid-template-columns: 1fr 1fr; column-gap: 14px; row-gap: 3px; margin-bottom: 8px; }
        .identity div { display: grid; grid-template-columns: 100px 1fr; }
        .identity span { border-bottom: 1px dotted #555; }
        h2 { margin: 7px 0 3px; padding: 3px 4px; background: #e7eee9; font-size: 8pt; }
        h3 { margin: 5px 0 2px; font-size: 7pt; }
        .table-block { break-inside: avoid; page-break-inside: avoid; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: .5px solid #53645a; padding: 2px 2px; line-height: 1.1; }
        thead th { background: #dcefe3; text-align: center; font-weight: 700; }
        tbody tr { break-inside: avoid; page-break-inside: avoid; }
        th:first-child, td.number { width: 5%; text-align: center; }
        .grade, .text-value { text-align: center; }
        .below-kkm { color: #dc2626; font-weight: 700; }
        footer { margin-top: 20px; }
        .place-date { margin: 0 0 5px; text-align: right; }
        .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; }
        .signatures div { display: flex; min-height: 38mm; flex-direction: column; justify-content: space-between; }
        .signatures strong { font-weight: 400; }
        @media screen {
          body { background: #edf2ee; padding: 12px; }
          .report-page { width: 190mm; min-height: 277mm; margin: 0 auto 12px; padding: 2mm; background: white; box-shadow: 0 1px 8px #0002; }
        }
      </style>
    </head>
    <body>`;

const createPrintableDocumentTitle = (reports: ReportStudent[]): string =>
  reports.length === 1 ? createReportFileName(reports[0]) : createClassReportFileName(reports[0]?.className ?? '-');

export const createPrintableReportHtml = (reports: ReportStudent[]): string =>
  `${createPrintableDocumentStart(createPrintableDocumentTitle(reports))}${reports.map(renderReport).join('')}</body></html>`;

export const printReports = async (reports: ReportStudent[]): Promise<void> => {
  if (reports.length === 0) throw new Error('Tidak ada data siswa untuk diekspor.');

  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Jendela cetak diblokir browser. Izinkan pop-up lalu coba lagi.');

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(createPrintableDocumentStart(createPrintableDocumentTitle(reports)));
  for (let index = 0; index < reports.length; index += 10) {
    printWindow.document.write(reports.slice(index, index + 10).map(renderReport).join(''));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  window.setTimeout(() => printWindow.print(), 300);
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
  top: { style: 'thin' as const, color: { argb: 'FF9AA99F' } },
  left: { style: 'thin' as const, color: { argb: 'FF9AA99F' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF9AA99F' } },
  right: { style: 'thin' as const, color: { argb: 'FF9AA99F' } },
};

const styleRow = (row: ExcelJS.Row) => {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
};

const columnLetter = (worksheet: ExcelJS.Worksheet, column: number): string => worksheet.getColumn(column).letter;

const addTableToWorksheet = (worksheet: ExcelJS.Worksheet, table: ReportTable, startRow: number): number => {
  const columnCount = tableColumnCount(table);
  const lastColumn = columnLetter(worksheet, columnCount);
  let rowNumber = startRow;

  worksheet.mergeCells(`A${rowNumber}:${lastColumn}${rowNumber}`);
  const titleCell = worksheet.getCell(`A${rowNumber}`);
  titleCell.value = table.title;
  titleCell.font = { bold: true, color: { argb: 'FF1F5135' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3ED' } };
  styleRow(worksheet.getRow(rowNumber));
  rowNumber += 1;

  let firstMetricColumn = table.showKkm ? 4 : 3;
  worksheet.mergeCells(`A${rowNumber}:A${rowNumber + 1}`);
  worksheet.mergeCells(`B${rowNumber}:B${rowNumber + 1}`);
  worksheet.getCell(`A${rowNumber}`).value = 'No.';
  worksheet.getCell(`B${rowNumber}`).value = table.showKkm ? 'Mata Pelajaran' : 'Penilaian';
  if (table.showKkm) {
    worksheet.mergeCells(`C${rowNumber}:C${rowNumber + 1}`);
    worksheet.getCell(`C${rowNumber}`).value = 'KKM';
  }

  let metricIndex = 0;
  while (metricIndex < table.metrics.length) {
    const metric = table.metrics[metricIndex];
    if (metric.group) {
      const groupedMetrics: typeof table.metrics = [];
      while (metricIndex < table.metrics.length && table.metrics[metricIndex].group === metric.group) {
        groupedMetrics.push(table.metrics[metricIndex]);
        metricIndex += 1;
      }

      const groupWidth = groupedMetrics.reduce((count, item) => count + (item.type === 'grade' ? 2 : 1), 0);
      const groupEnd = firstMetricColumn + groupWidth - 1;
      worksheet.mergeCells(`${columnLetter(worksheet, firstMetricColumn)}${rowNumber}:${columnLetter(worksheet, groupEnd)}${rowNumber}`);
      worksheet.getCell(`${columnLetter(worksheet, firstMetricColumn)}${rowNumber}`).value = metric.group;
      groupedMetrics.forEach((item) => {
        const width = item.type === 'grade' ? 2 : 1;
        const itemEnd = firstMetricColumn + width - 1;
        if (width === 2) {
          worksheet.mergeCells(`${columnLetter(worksheet, firstMetricColumn)}${rowNumber + 1}:${columnLetter(worksheet, itemEnd)}${rowNumber + 1}`);
        }
        worksheet.getCell(`${columnLetter(worksheet, firstMetricColumn)}${rowNumber + 1}`).value =
          item.type === 'grade' ? `${item.label} (Angka/Huruf)` : item.label;
        firstMetricColumn += width;
      });
      continue;
    }

    if (metric.type === 'grade') {
      worksheet.mergeCells(`${columnLetter(worksheet, firstMetricColumn)}${rowNumber}:${columnLetter(worksheet, firstMetricColumn + 1)}${rowNumber}`);
      worksheet.getCell(`${columnLetter(worksheet, firstMetricColumn)}${rowNumber}`).value = metric.label;
      worksheet.getCell(`${columnLetter(worksheet, firstMetricColumn)}${rowNumber + 1}`).value = 'Angka';
      worksheet.getCell(`${columnLetter(worksheet, firstMetricColumn + 1)}${rowNumber + 1}`).value = 'Huruf';
      firstMetricColumn += 2;
    } else {
      worksheet.mergeCells(`${columnLetter(worksheet, firstMetricColumn)}${rowNumber}:${columnLetter(worksheet, firstMetricColumn)}${rowNumber + 1}`);
      worksheet.getCell(`${columnLetter(worksheet, firstMetricColumn)}${rowNumber}`).value = metric.label;
      firstMetricColumn += 1;
    }
    metricIndex += 1;
  }

  [rowNumber, rowNumber + 1].forEach((headerRow) => {
    const row = worksheet.getRow(headerRow);
    styleRow(row);
    row.font = { bold: true };
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEFE3' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
  });
  rowNumber += 2;

  table.rows.forEach((item, itemIndex) => {
    const row = worksheet.getRow(rowNumber);
    const values: (string | number | null)[] = [itemIndex + 1, item.label];
    if (table.showKkm) values.push(item.kkm ?? '-');

    table.metrics.forEach((metric, metricIndex) => {
      const value = item.values[metricIndex];
      if (metric.type === 'grade') values.push(value?.score ?? '-', value?.letter ?? '-');
      else values.push(value?.text || '-');
    });

    row.values = values;
    styleRow(row);
    let valueColumn = table.showKkm ? 3 : 2;
    if (table.showKkm && item.kkm !== null) row.getCell(valueColumn).numFmt = '0.##';
    valueColumn += 1;

    table.metrics.forEach((metric, metricIndex) => {
      const value = item.values[metricIndex];
      if (metric.type === 'grade') {
        const scoreCell = row.getCell(valueColumn);
        scoreCell.alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(valueColumn + 1).alignment = { horizontal: 'center', vertical: 'middle' };
        if (value?.score !== null && value?.score !== undefined) {
          scoreCell.numFmt = '0.##';
          if (item.kkm !== null && value.score < item.kkm) scoreCell.font = { bold: true, color: { argb: 'FFDC2626' } };
        }
        valueColumn += 2;
      } else {
        row.getCell(valueColumn).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        valueColumn += 1;
      }
    });
    rowNumber += 1;
  });

  return rowNumber;
};

const addStudentWorksheet = (workbook: ExcelJS.Workbook, report: ReportStudent, index: number, names: Set<string>) => {
  const worksheet = workbook.addWorksheet(worksheetName(report.name, index, names));
  worksheet.columns = Array.from({ length: 14 }, (_, columnIndex) => ({
    width: columnIndex === 1 ? 30 : columnIndex < 3 ? 7 : 9,
  }));
  const lastColumn = columnLetter(worksheet, 14);

  worksheet.getCell('A1').value = 'Nama Siswa :';
  worksheet.mergeCells('B1:F1');
  worksheet.getCell('B1').value = report.name;
  worksheet.getCell('G1').value = 'Tahun Pelajaran :';
  worksheet.mergeCells('H1:N1');
  worksheet.getCell('H1').value = report.academicYear;

  worksheet.getCell('A2').value = 'Kelas/Semester :';
  worksheet.mergeCells('B2:F2');
  worksheet.getCell('B2').value = `${report.className} / ${report.semester}`;
  worksheet.getCell('G2').value = 'No. Induk :';
  worksheet.mergeCells('H2:N2');
  worksheet.getCell('H2').value = report.identityNumber;

  [1, 2].forEach((rowNumber) => {
    const row = worksheet.getRow(rowNumber);
    styleRow(row);
    ['A', 'G'].forEach((column) => {
      const cell = worksheet.getCell(`${column}${rowNumber}`);
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3ED' } };
    });
  });

  let rowNumber = 4;
  report.sections.forEach((section) => {
    worksheet.mergeCells(`A${rowNumber}:${lastColumn}${rowNumber}`);
    const sectionCell = worksheet.getCell(`A${rowNumber}`);
    sectionCell.value = section.title;
    sectionCell.font = { bold: true, color: { argb: 'FF1F5135' } };
    sectionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1EBE4' } };
    styleRow(worksheet.getRow(rowNumber));
    rowNumber += 1;

    section.tables.forEach((table) => {
      rowNumber = addTableToWorksheet(worksheet, table, rowNumber) + 1;
    });
  });

  worksheet.mergeCells(`A${rowNumber}:${lastColumn}${rowNumber}`);
  worksheet.getCell(`A${rowNumber}`).value = 'Kota, tanggal: -';
  worksheet.getCell(`A${rowNumber}`).alignment = { horizontal: 'right' };
  rowNumber += 1;
  worksheet.mergeCells(`A${rowNumber}:D${rowNumber}`);
  worksheet.mergeCells(`F${rowNumber}:I${rowNumber}`);
  worksheet.mergeCells(`K${rowNumber}:N${rowNumber}`);
  worksheet.getCell(`A${rowNumber}`).value = 'Orang Tua/Wali Siswa';
  worksheet.getCell(`F${rowNumber}`).value = 'Kepala Sekolah';
  worksheet.getCell(`K${rowNumber}`).value = 'Wali Kelas';
  [1, 6, 11].forEach((column) => {
    worksheet.getCell(rowNumber, column).font = { bold: true };
    worksheet.getCell(rowNumber, column).alignment = { horizontal: 'center' };
  });
  rowNumber += 4;
  worksheet.mergeCells(`A${rowNumber}:D${rowNumber}`);
  worksheet.mergeCells(`F${rowNumber}:I${rowNumber}`);
  worksheet.mergeCells(`K${rowNumber}:N${rowNumber}`);
  worksheet.getCell(`A${rowNumber}`).value = '( - )';
  worksheet.getCell(`F${rowNumber}`).value = '( - )';
  worksheet.getCell(`K${rowNumber}`).value = '( - )';
  [1, 6, 11].forEach((column) => worksheet.getCell(rowNumber, column).alignment = { horizontal: 'center' });

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 2,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 },
  };
  worksheet.pageSetup.printArea = `A1:${lastColumn}${rowNumber}`;
  worksheet.views = [{ state: 'normal', showGridLines: false }];
  worksheet.headerFooter.oddFooter = '&C&"Arial,Regular"Halaman &P dari &N';
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
