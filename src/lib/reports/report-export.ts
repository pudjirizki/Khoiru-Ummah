import type ExcelJS from 'exceljs';
import {
  AcademicSubjectReportRow,
  createClassReportFileName,
  createReportFileName,
  ExtracurricularReportRow,
  formatReportDate,
  GradePair,
  ReportItem,
  ReportStudent,
  TahfizhReportRow,
  TahsinReportRow,
} from './report-data';

const escapeHtml = (value: string | number | null | undefined): string =>
  String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatScore = (score: number | null | undefined): string =>
  score !== null && score !== undefined && Number.isFinite(score) ? String(score) : '-';

const formatBlankScore = (score: number | null | undefined): string =>
  score !== null && score !== undefined && Number.isFinite(score) ? String(score) : '';

const renderGradePairCells = (pair: GradePair): string =>
  `<td class="td-score">${escapeHtml(formatBlankScore(pair.score))}</td><td class="td-letter">${escapeHtml(pair.letter || '')}</td>`;

const renderStandardSubjectTableHtml = (
  rows: AcademicSubjectReportRow[],
  metricHeaders: string[] = ['Pengetahuan', 'Pemahaman', 'Keahlian', 'Minat', 'Proses']
): string => {
  const groupHeaders = metricHeaders.map((h) => `<th colspan="2" class="th-group">${escapeHtml(h)}</th>`).join('');
  const subHeaders = metricHeaders
    .map(() => `<th class="th-sub">Angka</th><th class="th-sub">Huruf</th>`)
    .join('');

  const bodyRows = rows
    .map(
      (row) => `
      <tr>
        <td class="td-no">${row.no}.</td>
        <td class="td-subject">${escapeHtml(row.subject)}</td>
        <td class="td-kkm">${row.kkm}</td>
        ${renderGradePairCells(row.pengetahuan)}
        ${renderGradePairCells(row.pemahaman)}
        ${renderGradePairCells(row.keahlian)}
        ${renderGradePairCells(row.minat)}
        ${renderGradePairCells(row.proses)}
      </tr>`
    )
    .join('');

  return `
    <table class="report-table academic-table">
      <thead>
        <tr>
          <th rowspan="2" class="th-no">No.</th>
          <th rowspan="2" class="th-subject">Mata Pelajaran</th>
          <th rowspan="2" class="th-kkm">KKM</th>
          ${groupHeaders}
        </tr>
        <tr>
          ${subHeaders}
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>`;
};

const renderTahfizhTableHtml = (rows: TahfizhReportRow[]): string => {
  const bodyRows = rows
    .map(
      (row) => `
      <tr>
        <td class="td-no">${row.no}.</td>
        <td class="td-subject">${escapeHtml(row.subject)}</td>
        <td class="td-kkm">${row.kkm}</td>
        <td class="td-text">${escapeHtml(row.setoran || '')}</td>
        <td class="td-text">${escapeHtml(row.mutqin || '')}</td>
        ${renderGradePairCells(row.kualitas)}
        ${renderGradePairCells(row.kecepatan)}
        ${renderGradePairCells(row.minat)}
        ${renderGradePairCells(row.proses)}
      </tr>`
    )
    .join('');

  return `
    <table class="report-table academic-table">
      <thead>
        <tr>
          <th rowspan="2" class="th-no">No.</th>
          <th rowspan="2" class="th-subject">Mata Pelajaran</th>
          <th rowspan="2" class="th-kkm">KKM</th>
          <th colspan="2" class="th-group">Kuantitas</th>
          <th colspan="2" class="th-group">Kualitas</th>
          <th colspan="2" class="th-group">Kecepatan</th>
          <th colspan="2" class="th-group">Minat</th>
          <th colspan="2" class="th-group">Proses</th>
        </tr>
        <tr>
          <th class="th-sub">Setoran</th>
          <th class="th-sub">Mutqin</th>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>`;
};

const renderTahsinTableHtml = (rows: TahsinReportRow[]): string => {
  const bodyRows = rows
    .map(
      (row) => `
      <tr>
        <td class="td-no">${row.no}.</td>
        <td class="td-subject">${escapeHtml(row.subject)}</td>
        <td class="td-kkm">${row.kkm}</td>
        <td class="td-text">${escapeHtml(row.capaian || '')}</td>
        ${renderGradePairCells(row.fashohah)}
        ${renderGradePairCells(row.tartil)}
        ${renderGradePairCells(row.minat)}
        ${renderGradePairCells(row.proses)}
      </tr>`
    )
    .join('');

  return `
    <table class="report-table tahsin-table">
      <thead>
        <tr>
          <th rowspan="2" class="th-no">No.</th>
          <th rowspan="2" class="th-subject">Mata Pelajaran</th>
          <th rowspan="2" class="th-kkm">KKM</th>
          <th rowspan="2" class="th-capaian">Capaian</th>
          <th colspan="2" class="th-group">Fashohah</th>
          <th colspan="2" class="th-group">Tartil</th>
          <th colspan="2" class="th-group">Minat</th>
          <th colspan="2" class="th-group">Proses</th>
        </tr>
        <tr>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>`;
};

const renderExtracurricularTableHtml = (rows: ExtracurricularReportRow[]): string => {
  const bodyRows = rows
    .map(
      (row) => `
      <tr>
        <td class="td-no">${row.no}.</td>
        <td class="td-subject">${escapeHtml(row.subject)}</td>
        <td class="td-kkm">${row.kkm}</td>
        ${renderGradePairCells(row.minat)}
        ${renderGradePairCells(row.kesungguhan)}
        ${renderGradePairCells(row.kreativitas)}
      </tr>`
    )
    .join('');

  return `
    <table class="report-table ekskul-table">
      <thead>
        <tr>
          <th rowspan="2" class="th-no">No.</th>
          <th rowspan="2" class="th-subject">Mata Pelajaran</th>
          <th rowspan="2" class="th-kkm">KKM</th>
          <th colspan="2" class="th-group">Minat</th>
          <th colspan="2" class="th-group">Kesungguhan</th>
          <th colspan="2" class="th-group">Kreativitas/Inovasi</th>
        </tr>
        <tr>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
          <th class="th-sub">Angka</th>
          <th class="th-sub">Huruf</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>`;
};

const renderSikapPerilakuTableHtml = (titleHeader: string, items: ReportItem[]): string => {
  const rowsHtml = items
    .map(
      (item) => `
        <tr>
          <td class="td-no">${item.no}.</td>
          <td class="td-item">${escapeHtml(item.label)}</td>
          <td class="td-score">${escapeHtml(formatScore(item.score))}</td>
          <td class="td-letter">${escapeHtml(item.letter || '-')}</td>
        </tr>`
    )
    .join('');

  return `
    <table class="report-table sikap-table">
      <thead>
        <tr>
          <th rowspan="2" class="th-no">No.</th>
          <th rowspan="2" class="th-item">${escapeHtml(titleHeader)}</th>
          <th colspan="2" class="th-grade">Penilaian</th>
        </tr>
        <tr>
          <th class="th-sub-sm">Angka</th>
          <th class="th-sub-sm">Huruf</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>`;
};

const renderCheckbox = (checked: boolean): string =>
  checked
    ? '<span class="chk chk-checked">&#9745;</span>'
    : '<span class="chk">&#9744;</span>';

const renderReportPage = (report: ReportStudent): string => {
  const displayClassSemester = `${escapeHtml(report.className)}/${escapeHtml(report.semester)}`;
  const displayDateAndPlace = report.dateAndPlace || formatReportDate();

  const sakitText = report.ketidakhadiran.sakit !== null ? String(report.ketidakhadiran.sakit) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
  const izinText = report.ketidakhadiran.izin !== null ? String(report.ketidakhadiran.izin) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
  const alphaText =
    report.ketidakhadiran.tanpaKeterangan !== null
      ? String(report.ketidakhadiran.tanpaKeterangan)
      : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';

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

      <section class="section-block">
        <h3 class="section-title">A. PENILAIAN MATA PELAJARAN</h3>
        <div class="sub-table">${renderTahfizhTableHtml(report.tahfizhRows)}</div>
        <div class="sub-table">${renderTahsinTableHtml(report.tahsinRows)}</div>
        <div class="sub-table">${renderStandardSubjectTableHtml(report.mapelUmumRows)}</div>
      </section>

      <section class="section-block">
        <h3 class="section-title">B. PENILAIAN MATA PELAJARAN INTI</h3>
        ${renderStandardSubjectTableHtml(report.mapelIntiRows)}
      </section>

      <section class="section-block">
        <h3 class="section-title">C. PENILAIAN MATA PELAJARAN PENUNJANG</h3>
        ${renderStandardSubjectTableHtml(report.mapelPenunjangRows)}
      </section>

      <section class="section-block">
        <h3 class="section-title">D. PENILAIAN EKSTRAKURIKULER</h3>
        ${renderExtracurricularTableHtml(report.ekstrakurikulerRows)}
      </section>

      <section class="section-block">
        <h3 class="section-title">E. SIKAP DAN PERILAKU SISWA</h3>
        ${renderSikapPerilakuTableHtml('Sikap', report.sikapItems)}
      </section>
    </article>

    <article class="report-page report-page-second">
      <div class="page-two-content">
        <section class="section-block">
          ${renderSikapPerilakuTableHtml('Perilaku / AL BIAH KU', report.perilakuItems)}
        </section>

        <section class="section-block">
          <h3 class="section-title">F. TARAF BERPIKIR</h3>
          <table class="report-table berpikir-table">
            <thead>
              <tr>
                <th>Pola Pikir</th>
                <th>Berpikir Benar</th>
                <th>Berpikir Solutif</th>
                <th>Berpikir Cepat</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="td-center">${renderCheckbox(report.tarafBerpikir.polaPikir)}</td>
                <td class="td-center">${renderCheckbox(report.tarafBerpikir.berpikirBenar)}</td>
                <td class="td-center">${renderCheckbox(report.tarafBerpikir.berpikirSolutif)}</td>
                <td class="td-center">${renderCheckbox(report.tarafBerpikir.berpikirCepat)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section-block">
          <h3 class="section-title">G. KETIDAKHADIRAN</h3>
          <table class="report-table absen-table">
            <tbody>
              <tr>
                <td class="td-absen-label">Ketidakhadiran</td>
                <td class="td-absen-detail">
                  <div>1. Sakit = ${sakitText} hari</div>
                  <div>2. Izin = ${izinText} hari</div>
                  <div>3. Tanpa Keterangan = ${alphaText} hari</div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section-block">
          <h3 class="section-title">H. KESIMPULAN</h3>
          <table class="report-table kesimpulan-table">
            <thead>
              <tr>
                <th class="th-half">Proses</th>
                <th class="th-half">Output</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="td-kesimpulan-val">${escapeHtml(report.kesimpulan.proses || '') || '&nbsp;'}</td>
                <td class="td-kesimpulan-val">${escapeHtml(report.kesimpulan.output || '') || '&nbsp;'}</td>
              </tr>
              <tr>
                <td colspan="2" class="td-catatan">
                  <div class="catatan-label">Catatan untuk diperhatikan orang tua/wali:</div>
                  <div class="catatan-body">${escapeHtml(report.kesimpulan.catatan || '') || '&nbsp;'}</div>
                </td>
              </tr>
              <tr>
                <td colspan="2" class="td-kenaikan">
                  <strong>Keterangan kenaikan kelas:</strong> ${escapeHtml(report.kesimpulan.kenaikanKelas || '')}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer class="footer-container">
          <div class="date-line">${escapeHtml(displayDateAndPlace)}</div>
          <div class="signatures-grid">
            <div class="sig-col">
              <div class="sig-role sig-role-offset">Orang Tua / Wali Siswa</div>
              <div class="sig-space"></div>
              <div class="sig-name">(……………………………)</div>
            </div>
            <div class="sig-col">
              <div class="sig-mengetahui">Mengetahui</div>
              <div class="sig-role">Kepala Sekolah,</div>
              <div class="sig-space"></div>
              <div class="sig-name">(……………………………)</div>
            </div>
            <div class="sig-col">
              <div class="sig-role sig-role-offset">Wali Kelas,</div>
              <div class="sig-space"></div>
              <div class="sig-name">(……………………………)</div>
            </div>
          </div>
        </footer>
      </div>
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
          margin: 9mm 13mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          color: #111827;
          font-family: "Times New Roman", Times, Georgia, serif;
          font-size: 8pt;
          line-height: 1.2;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .report-page {
          width: 100%;
          break-after: page;
          page-break-after: always;
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
          column-gap: 20px;
          row-gap: 2px;
          font-size: 8.5pt;
          font-weight: 700;
        }
        .identity-item {
          display: flex;
          align-items: baseline;
        }
        .identity-item .label {
          width: 105px;
          flex-shrink: 0;
        }
        .identity-item .colon {
          width: 12px;
          flex-shrink: 0;
        }
        .identity-item .val {
          flex: 1;
        }
        .section-block {
          margin-bottom: 6px;
        }
        .section-title {
          margin: 0 0 3px 0;
          font-size: 8pt;
          font-weight: 700;
          letter-spacing: 0.2px;
        }
        .sub-table {
          margin-bottom: 5px;
        }
        .sub-table:last-child {
          margin-bottom: 0;
        }
        table.report-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 7.5pt;
        }
        table.report-table th,
        table.report-table td {
          border: 1px solid #1f2937;
          padding: 1.5px 3px;
          vertical-align: middle;
        }
        table.report-table thead th {
          background-color: #f8fafc;
          font-weight: 700;
          text-align: center;
        }
        th.th-no {
          width: 24px;
        }
        th.th-subject {
          width: 102px;
        }
        th.th-kkm {
          width: 30px;
        }
        th.th-capaian {
          width: 72px;
        }
        th.th-group {
          text-align: center;
        }
        th.th-sub {
          font-size: 7pt;
        }
        td.td-no,
        td.td-kkm,
        td.td-score,
        td.td-letter,
        td.td-text,
        td.td-center {
          text-align: center;
        }
        td.td-subject {
          text-align: left;
          padding-left: 4px;
        }
        table.ekskul-table {
          width: 74%;
        }
        table.ekskul-table th.th-subject {
          width: 105px;
        }
        table.sikap-table {
          width: 42%;
        }
        table.sikap-table th.th-item {
          width: auto;
        }
        table.sikap-table th.th-grade {
          width: 76px;
        }
        table.sikap-table th.th-sub-sm {
          width: 38px;
          font-size: 7pt;
        }
        td.td-item {
          text-align: left;
          padding-left: 4px;
        }
        table.berpikir-table {
          width: 68%;
        }
        .chk {
          font-size: 10pt;
          line-height: 1;
        }
        table.absen-table {
          width: 52%;
        }
        td.td-absen-label {
          width: 38%;
          text-align: left;
          padding-left: 5px;
          font-weight: 700;
        }
        td.td-absen-detail {
          text-align: left;
          padding: 3px 6px;
          font-weight: 700;
          line-height: 1.35;
        }
        table.kesimpulan-table th.th-half {
          width: 50%;
        }
        td.td-kesimpulan-val {
          text-align: center;
          font-weight: 700;
          padding: 3px 4px;
          min-height: 18px;
        }
        td.td-catatan {
          text-align: left;
          padding: 3px 5px;
        }
        .catatan-label {
          font-weight: 700;
          margin-bottom: 4px;
        }
        .catatan-body {
          min-height: 14px;
          font-weight: 700;
        }
        td.td-kenaikan {
          text-align: left;
          padding: 3px 5px;
        }
        .footer-container {
          margin-top: 16px;
          font-size: 8.5pt;
        }
        .date-line {
          text-align: right;
          font-weight: 700;
          margin-bottom: 10px;
          padding-right: 14px;
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
          min-height: 24mm;
        }
        .sig-mengetahui {
          font-weight: 700;
          margin-bottom: 2px;
        }
        .sig-role {
          font-weight: 700;
        }
        .sig-role-offset {
          margin-top: 14px;
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
            padding: 10mm 14mm;
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
  top: { style: 'thin' as const, color: { argb: 'FF1F2937' } },
  left: { style: 'thin' as const, color: { argb: 'FF1F2937' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF1F2937' } },
  right: { style: 'thin' as const, color: { argb: 'FF1F2937' } },
};

const styleTableCells = (row: ExcelJS.Row, colFrom: number, colTo: number, fillHeader = false) => {
  for (let c = colFrom; c <= colTo; c += 1) {
    const cell = row.getCell(c);
    cell.border = thinBorder;
    cell.font = { name: 'Times New Roman', size: 9, bold: fillHeader };
    if (fillHeader) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    }
  }
};

const setGradePairExcel = (row: ExcelJS.Row, colStart: number, pair: GradePair) => {
  const cScore = row.getCell(colStart);
  cScore.value = pair.score !== null && pair.score !== undefined ? pair.score : '';
  cScore.alignment = { horizontal: 'center', vertical: 'middle' };
  if (pair.score !== null && pair.score !== undefined) {
    cScore.numFmt = '0';
  }

  const cLetter = row.getCell(colStart + 1);
  cLetter.value = pair.letter || '';
  cLetter.alignment = { horizontal: 'center', vertical: 'middle' };
};

const addStudentWorksheet = (workbook: ExcelJS.Workbook, report: ReportStudent, index: number, names: Set<string>) => {
  const sheet = workbook.addWorksheet(worksheetName(report.name, index, names));

  // 13 columns (A..M)
  sheet.columns = [
    { width: 5 }, // A: No.
    { width: 24 }, // B: Mata Pelajaran / Sikap
    { width: 6 }, // C: KKM
    { width: 7.5 }, // D
    { width: 7.5 }, // E
    { width: 7.5 }, // F
    { width: 7.5 }, // G
    { width: 7.5 }, // H
    { width: 7.5 }, // I
    { width: 7.5 }, // J
    { width: 7.5 }, // K
    { width: 7.5 }, // L
    { width: 7.5 }, // M
  ];

  // Header Identity
  sheet.getCell('A1').value = 'Nama Siswa';
  sheet.getCell('A1').font = { name: 'Times New Roman', bold: true, size: 10 };
  sheet.mergeCells('B1:F1');
  sheet.getCell('B1').value = `: ${report.name}`;
  sheet.getCell('B1').font = { name: 'Times New Roman', bold: true, size: 10 };
  sheet.mergeCells('G1:I1');
  sheet.getCell('G1').value = 'Tahun Pelajaran';
  sheet.getCell('G1').font = { name: 'Times New Roman', bold: true, size: 10 };
  sheet.mergeCells('J1:M1');
  sheet.getCell('J1').value = `: ${report.academicYear}`;
  sheet.getCell('J1').font = { name: 'Times New Roman', bold: true, size: 10 };

  sheet.getCell('A2').value = 'No. Induk Siswa';
  sheet.getCell('A2').font = { name: 'Times New Roman', bold: true, size: 10 };
  sheet.mergeCells('B2:F2');
  sheet.getCell('B2').value = `: ${report.identityNumber}`;
  sheet.getCell('B2').font = { name: 'Times New Roman', bold: true, size: 10 };
  sheet.mergeCells('G2:I2');
  sheet.getCell('G2').value = 'Kelas/Semester';
  sheet.getCell('G2').font = { name: 'Times New Roman', bold: true, size: 10 };
  sheet.mergeCells('J2:M2');
  sheet.getCell('J2').value = `: ${report.className}/${report.semester}`;
  sheet.getCell('J2').font = { name: 'Times New Roman', bold: true, size: 10 };

  let currentRow = 4;

  const addSectionTitle = (title: string) => {
    sheet.mergeCells(`A${currentRow}:M${currentRow}`);
    const cell = sheet.getCell(`A${currentRow}`);
    cell.value = title;
    cell.font = { name: 'Times New Roman', bold: true, size: 9.5 };
    currentRow += 1;
  };

  const renderStandardAcademicExcel = (rows: AcademicSubjectReportRow[]) => {
    const groups = ['Pengetahuan', 'Pemahaman', 'Keahlian', 'Minat', 'Proses'];
    sheet.mergeCells(`A${currentRow}:A${currentRow + 1}`);
    sheet.mergeCells(`B${currentRow}:B${currentRow + 1}`);
    sheet.mergeCells(`C${currentRow}:C${currentRow + 1}`);

    sheet.getCell(`A${currentRow}`).value = 'No.';
    sheet.getCell(`B${currentRow}`).value = 'Mata Pelajaran';
    sheet.getCell(`C${currentRow}`).value = 'KKM';

    groups.forEach((g, idx) => {
      const col1 = 4 + idx * 2;
      sheet.mergeCells(currentRow, col1, currentRow, col1 + 1);
      sheet.getCell(currentRow, col1).value = g;
      sheet.getCell(currentRow + 1, col1).value = 'Angka';
      sheet.getCell(currentRow + 1, col1 + 1).value = 'Huruf';
    });

    [currentRow, currentRow + 1].forEach((rNum) => {
      const r = sheet.getRow(rNum);
      styleTableCells(r, 1, 13, true);
      for (let c = 1; c <= 13; c += 1) {
        r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    currentRow += 2;

    rows.forEach((item) => {
      const r = sheet.getRow(currentRow);
      r.getCell(1).value = `${item.no}.`;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).value = item.subject;
      r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(3).value = item.kkm;
      r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      setGradePairExcel(r, 4, item.pengetahuan);
      setGradePairExcel(r, 6, item.pemahaman);
      setGradePairExcel(r, 8, item.keahlian);
      setGradePairExcel(r, 10, item.minat);
      setGradePairExcel(r, 12, item.proses);
      styleTableCells(r, 1, 13);
      currentRow += 1;
    });
  };

  // A. PENILAIAN MATA PELAJARAN
  addSectionTitle('A. PENILAIAN MATA PELAJARAN');

  // A1: Tahfizhul Qur'an
  sheet.mergeCells(`A${currentRow}:A${currentRow + 1}`);
  sheet.mergeCells(`B${currentRow}:B${currentRow + 1}`);
  sheet.mergeCells(`C${currentRow}:C${currentRow + 1}`);
  sheet.getCell(`A${currentRow}`).value = 'No.';
  sheet.getCell(`B${currentRow}`).value = 'Mata Pelajaran';
  sheet.getCell(`C${currentRow}`).value = 'KKM';
  const tahfizhGroups = [
    { name: 'Kuantitas', sub1: 'Setoran', sub2: 'Mutqin' },
    { name: 'Kualitas', sub1: 'Angka', sub2: 'Huruf' },
    { name: 'Kecepatan', sub1: 'Angka', sub2: 'Huruf' },
    { name: 'Minat', sub1: 'Angka', sub2: 'Huruf' },
    { name: 'Proses', sub1: 'Angka', sub2: 'Huruf' },
  ];
  tahfizhGroups.forEach((g, idx) => {
    const col1 = 4 + idx * 2;
    sheet.mergeCells(currentRow, col1, currentRow, col1 + 1);
    sheet.getCell(currentRow, col1).value = g.name;
    sheet.getCell(currentRow + 1, col1).value = g.sub1;
    sheet.getCell(currentRow + 1, col1 + 1).value = g.sub2;
  });
  [currentRow, currentRow + 1].forEach((rNum) => {
    const r = sheet.getRow(rNum);
    styleTableCells(r, 1, 13, true);
    for (let c = 1; c <= 13; c += 1) {
      r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });
  currentRow += 2;

  report.tahfizhRows.forEach((item) => {
    const r = sheet.getRow(currentRow);
    r.getCell(1).value = `${item.no}.`;
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(2).value = item.subject;
    r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(3).value = item.kkm;
    r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(4).value = item.setoran || '';
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).value = item.mutqin || '';
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    setGradePairExcel(r, 6, item.kualitas);
    setGradePairExcel(r, 8, item.kecepatan);
    setGradePairExcel(r, 10, item.minat);
    setGradePairExcel(r, 12, item.proses);
    styleTableCells(r, 1, 13);
    currentRow += 1;
  });
  currentRow += 1;

  // A2: Tahsinul Qur'an
  sheet.mergeCells(`A${currentRow}:A${currentRow + 1}`);
  sheet.mergeCells(`B${currentRow}:B${currentRow + 1}`);
  sheet.mergeCells(`C${currentRow}:C${currentRow + 1}`);
  sheet.mergeCells(`D${currentRow}:E${currentRow + 1}`);
  sheet.getCell(`A${currentRow}`).value = 'No.';
  sheet.getCell(`B${currentRow}`).value = 'Mata Pelajaran';
  sheet.getCell(`C${currentRow}`).value = 'KKM';
  sheet.getCell(`D${currentRow}`).value = 'Capaian';
  ['Fashohah', 'Tartil', 'Minat', 'Proses'].forEach((g, idx) => {
    const col1 = 6 + idx * 2;
    sheet.mergeCells(currentRow, col1, currentRow, col1 + 1);
    sheet.getCell(currentRow, col1).value = g;
    sheet.getCell(currentRow + 1, col1).value = 'Angka';
    sheet.getCell(currentRow + 1, col1 + 1).value = 'Huruf';
  });
  [currentRow, currentRow + 1].forEach((rNum) => {
    const r = sheet.getRow(rNum);
    styleTableCells(r, 1, 13, true);
    for (let c = 1; c <= 13; c += 1) {
      r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });
  currentRow += 2;

  report.tahsinRows.forEach((item) => {
    sheet.mergeCells(`D${currentRow}:E${currentRow}`);
    const r = sheet.getRow(currentRow);
    r.getCell(1).value = `${item.no}.`;
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(2).value = item.subject;
    r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(3).value = item.kkm;
    r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(4).value = item.capaian || '';
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    setGradePairExcel(r, 6, item.fashohah);
    setGradePairExcel(r, 8, item.tartil);
    setGradePairExcel(r, 10, item.minat);
    setGradePairExcel(r, 12, item.proses);
    styleTableCells(r, 1, 13);
    currentRow += 1;
  });
  currentRow += 1;

  // A3: Bahasa Arab & Bahasa Indonesia
  renderStandardAcademicExcel(report.mapelUmumRows);
  currentRow += 1;

  // B. PENILAIAN MATA PELAJARAN INTI
  addSectionTitle('B. PENILAIAN MATA PELAJARAN INTI');
  renderStandardAcademicExcel(report.mapelIntiRows);
  currentRow += 1;

  // C. PENILAIAN MATA PELAJARAN PENUNJANG
  addSectionTitle('C. PENILAIAN MATA PELAJARAN PENUNJANG');
  renderStandardAcademicExcel(report.mapelPenunjangRows);
  currentRow += 1;

  // D. PENILAIAN EKSTRAKURIKULER
  addSectionTitle('D. PENILAIAN EKSTRAKURIKULER');
  sheet.mergeCells(`A${currentRow}:A${currentRow + 1}`);
  sheet.mergeCells(`B${currentRow}:B${currentRow + 1}`);
  sheet.mergeCells(`C${currentRow}:C${currentRow + 1}`);
  sheet.getCell(`A${currentRow}`).value = 'No.';
  sheet.getCell(`B${currentRow}`).value = 'Mata Pelajaran';
  sheet.getCell(`C${currentRow}`).value = 'KKM';
  ['Minat', 'Kesungguhan', 'Kreativitas/Inovasi'].forEach((g, idx) => {
    const col1 = 4 + idx * 2;
    sheet.mergeCells(currentRow, col1, currentRow, col1 + 1);
    sheet.getCell(currentRow, col1).value = g;
    sheet.getCell(currentRow + 1, col1).value = 'Angka';
    sheet.getCell(currentRow + 1, col1 + 1).value = 'Huruf';
  });
  [currentRow, currentRow + 1].forEach((rNum) => {
    const r = sheet.getRow(rNum);
    styleTableCells(r, 1, 9, true);
    for (let c = 1; c <= 9; c += 1) {
      r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });
  currentRow += 2;

  report.ekstrakurikulerRows.forEach((item) => {
    const r = sheet.getRow(currentRow);
    r.getCell(1).value = `${item.no}.`;
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(2).value = item.subject;
    r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(3).value = item.kkm;
    r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    setGradePairExcel(r, 4, item.minat);
    setGradePairExcel(r, 6, item.kesungguhan);
    setGradePairExcel(r, 8, item.kreativitas);
    styleTableCells(r, 1, 9);
    currentRow += 1;
  });
  currentRow += 1;

  // E. SIKAP DAN PERILAKU SISWA
  addSectionTitle('E. SIKAP DAN PERILAKU SISWA');

  const renderSikapTableExcel = (headerTitle: string, items: ReportItem[]) => {
    sheet.mergeCells(`A${currentRow}:A${currentRow + 1}`);
    sheet.mergeCells(`B${currentRow}:C${currentRow + 1}`);
    sheet.mergeCells(`D${currentRow}:E${currentRow}`);

    sheet.getCell(`A${currentRow}`).value = 'No.';
    sheet.getCell(`B${currentRow}`).value = headerTitle;
    sheet.getCell(`D${currentRow}`).value = 'Penilaian';
    sheet.getCell(`D${currentRow + 1}`).value = 'Angka';
    sheet.getCell(`E${currentRow + 1}`).value = 'Huruf';

    [currentRow, currentRow + 1].forEach((rNum) => {
      const r = sheet.getRow(rNum);
      styleTableCells(r, 1, 5, true);
      for (let c = 1; c <= 5; c += 1) {
        r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    currentRow += 2;

    items.forEach((item) => {
      sheet.mergeCells(`B${currentRow}:C${currentRow}`);
      const r = sheet.getRow(currentRow);
      r.getCell(1).value = `${item.no}.`;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).value = item.label;
      r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(4).value = item.score !== null && item.score !== undefined ? item.score : '-';
      r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      if (item.score !== null && item.score !== undefined) {
        r.getCell(4).numFmt = '0';
      }
      r.getCell(5).value = item.letter || '-';
      r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      styleTableCells(r, 1, 5);
      currentRow += 1;
    });
  };

  renderSikapTableExcel('Sikap', report.sikapItems);
  currentRow += 1;
  renderSikapTableExcel('Perilaku / AL BIAH KU', report.perilakuItems);
  currentRow += 1;

  // F. TARAF BERPIKIR
  addSectionTitle('F. TARAF BERPIKIR');
  const berpikirCols = [
    { label: 'Pola Pikir', checked: report.tarafBerpikir.polaPikir },
    { label: 'Berpikir Benar', checked: report.tarafBerpikir.berpikirBenar },
    { label: 'Berpikir Solutif', checked: report.tarafBerpikir.berpikirSolutif },
    { label: 'Berpikir Cepat', checked: report.tarafBerpikir.berpikirCepat },
  ];
  berpikirCols.forEach((col, idx) => {
    const c1 = 1 + idx * 2;
    sheet.mergeCells(currentRow, c1, currentRow, c1 + 1);
    sheet.getCell(currentRow, c1).value = col.label;
    sheet.getCell(currentRow, c1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells(currentRow + 1, c1, currentRow + 1, c1 + 1);
    sheet.getCell(currentRow + 1, c1).value = col.checked ? '☑' : '☐';
    sheet.getCell(currentRow + 1, c1).alignment = { horizontal: 'center', vertical: 'middle' };
  });
  styleTableCells(sheet.getRow(currentRow), 1, 8, true);
  styleTableCells(sheet.getRow(currentRow + 1), 1, 8, false);
  currentRow += 3;

  // G. KETIDAKHADIRAN
  addSectionTitle('G. KETIDAKHADIRAN');
  sheet.mergeCells(`A${currentRow}:B${currentRow + 2}`);
  sheet.getCell(`A${currentRow}`).value = 'Ketidakhadiran';
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  const absenLines = [
    `1. Sakit = ${report.ketidakhadiran.sakit ?? '    '} hari`,
    `2. Izin = ${report.ketidakhadiran.izin ?? '    '} hari`,
    `3. Tanpa Keterangan = ${report.ketidakhadiran.tanpaKeterangan ?? '    '} hari`,
  ];
  absenLines.forEach((line, idx) => {
    sheet.mergeCells(`C${currentRow + idx}:G${currentRow + idx}`);
    sheet.getCell(`C${currentRow + idx}`).value = line;
    sheet.getCell(`C${currentRow + idx}`).alignment = { horizontal: 'left', vertical: 'middle' };
    styleTableCells(sheet.getRow(currentRow + idx), 1, 7, false);
    sheet.getRow(currentRow + idx).getCell(1).font = { name: 'Times New Roman', size: 9, bold: true };
    sheet.getRow(currentRow + idx).getCell(3).font = { name: 'Times New Roman', size: 9, bold: true };
  });
  currentRow += 4;

  // H. KESIMPULAN
  addSectionTitle('H. KESIMPULAN');
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  sheet.mergeCells(`G${currentRow}:M${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = 'Proses';
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell(`G${currentRow}`).value = 'Output';
  sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  styleTableCells(sheet.getRow(currentRow), 1, 13, true);
  currentRow += 1;

  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  sheet.mergeCells(`G${currentRow}:M${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = report.kesimpulan.proses || '';
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell(`G${currentRow}`).value = report.kesimpulan.output || '';
  sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  styleTableCells(sheet.getRow(currentRow), 1, 13, false);
  sheet.getRow(currentRow).getCell(1).font = { name: 'Times New Roman', size: 9, bold: true };
  sheet.getRow(currentRow).getCell(7).font = { name: 'Times New Roman', size: 9, bold: true };
  currentRow += 1;

  sheet.mergeCells(`A${currentRow}:M${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = `Catatan untuk diperhatikan orang tua/wali:\n${report.kesimpulan.catatan || ''}`;
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  sheet.getRow(currentRow).height = 30;
  styleTableCells(sheet.getRow(currentRow), 1, 13, false);
  sheet.getRow(currentRow).getCell(1).font = { name: 'Times New Roman', size: 9, bold: true };
  currentRow += 1;

  sheet.mergeCells(`A${currentRow}:M${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = `Keterangan kenaikan kelas: ${report.kesimpulan.kenaikanKelas || ''}`;
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  styleTableCells(sheet.getRow(currentRow), 1, 13, false);
  sheet.getRow(currentRow).getCell(1).font = { name: 'Times New Roman', size: 9, bold: true };
  currentRow += 2;

  // Footer / Signatures
  sheet.mergeCells(`J${currentRow}:M${currentRow}`);
  const dateCell = sheet.getCell(`J${currentRow}`);
  dateCell.value = report.dateAndPlace || formatReportDate();
  dateCell.font = { name: 'Times New Roman', bold: true, size: 9.5 };
  dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
  currentRow += 1;

  sheet.mergeCells(`E${currentRow}:I${currentRow}`);
  const mengetCell = sheet.getCell(`E${currentRow}`);
  mengetCell.value = 'Mengetahui';
  mengetCell.font = { name: 'Times New Roman', bold: true, size: 9.5 };
  mengetCell.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow += 1;

  const sigRow = currentRow;
  sheet.mergeCells(`A${sigRow}:D${sigRow}`);
  sheet.getCell(`A${sigRow}`).value = 'Orang Tua / Wali Siswa';
  sheet.getCell(`A${sigRow}`).font = { name: 'Times New Roman', bold: true, size: 9.5 };
  sheet.getCell(`A${sigRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`E${sigRow}:I${sigRow}`);
  sheet.getCell(`E${sigRow}`).value = 'Kepala Sekolah,';
  sheet.getCell(`E${sigRow}`).font = { name: 'Times New Roman', bold: true, size: 9.5 };
  sheet.getCell(`E${sigRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`J${sigRow}:M${sigRow}`);
  sheet.getCell(`J${sigRow}`).value = 'Wali Kelas,';
  sheet.getCell(`J${sigRow}`).font = { name: 'Times New Roman', bold: true, size: 9.5 };
  sheet.getCell(`J${sigRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  currentRow += 4;

  const nameRow = currentRow;
  sheet.mergeCells(`A${nameRow}:D${nameRow}`);
  sheet.getCell(`A${nameRow}`).value = '(……………………………)';
  sheet.getCell(`A${nameRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`E${nameRow}:I${nameRow}`);
  sheet.getCell(`E${nameRow}`).value = '(……………………………)';
  sheet.getCell(`E${nameRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`J${nameRow}:M${nameRow}`);
  sheet.getCell(`J${nameRow}`).value = '(……………………………)';
  sheet.getCell(`J${nameRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 2,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
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
