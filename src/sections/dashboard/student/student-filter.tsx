import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Icon } from '@iconify/react';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { useDebounce } from '/src/hooks/use-debounce';
import { UseDatabaseStudentInterface } from '/src/hooks/use-database-student';
// interfaces
import { UserInterface } from '/src/interfaces/user';
import { StudentInterface } from '/src/interfaces/student';
// utils
import { fDate } from '/src/utils/format-time';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { DialogGeneral } from '/src/components/dialog';
import { InputField, SelectField } from '/src/components/form';
//
import { FilterInterface } from './view/student-view';

// ----------------------------------------------------------------------
interface OptionSelectInterface {
  label: string;
  value: string;
}

interface DataExcelInterface {
  Nama: string;
  NIS: string;
  Kelas: string;
  'Wali Siswa'?: string;
}

interface NormalizedDataExcelInterface {
  name: string;
  identityNumber: string;
  class: string;
  parentId?: string;
}

interface StudentFilterProps {
  studentsList: StudentInterface[];
  usersList: UserInterface[];
  filters: FilterInterface;
  setFilters: React.Dispatch<React.SetStateAction<FilterInterface>>;
  createStudent: UseDatabaseStudentInterface['createStudent'];
}

// ----------------------------------------------------------------------

const classOptions: OptionSelectInterface[] = [
  { label: 'Semua', value: '' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
];

// ----------------------------------------------------------------------

const StudentFilter: React.FC<StudentFilterProps> = ({ studentsList, usersList, filters, setFilters, createStudent }) => {
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  const debouncedSearchValue = useDebounce(searchValue, 500);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.search === debouncedSearchValue) return prev;

      return { ...prev, search: debouncedSearchValue };
    });
  }, [debouncedSearchValue, setFilters]);

  useEffect(() => {
    setSearchValue(filters.search ?? '');
  }, [filters.search]);

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[320px] flex-1">
            <Icon icon="solar:magnifer-bold" width={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <InputField
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Cari nama siswa..."
              inputClassname="pl-12 py-3 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="w-full md:w-[180px]">
            <SelectField
              value={classOptions.find((c) => c.value === filters.class)}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  class: e?.value,
                }))
              }
              options={classOptions}
              placeholder="Semua Kelas"
              isSearchable={false}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <RenderImport createStudent={createStudent} />
          <RenderExport studentsList={studentsList} usersList={usersList} />
        </div>
      </div>
    </div>
  );
};

function RenderImport({ onParsed, createStudent }: { onParsed?: (data: NormalizedDataExcelInterface[]) => void; createStudent: UseDatabaseStudentInterface['createStudent'] }) {
  const [dataImport, setDataImport] = useState<NormalizedDataExcelInterface[]>([]);

  const isShowDialog = useBoolean(false);

  const isLoading = useBoolean(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleDownloadTemplate = useCallback(() => {
    const data: DataExcelInterface[] = [
      {
        Nama: 'Nama Siswa 1',
        NIS: '123456789',
        Kelas: '1',
      },
      {
        Nama: 'Nama Siswa 2',
        NIS: '234567891',
        Kelas: '2',
      },
      {
        Nama: 'Nama Siswa 3',
        NIS: '345678912',
        Kelas: '3',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'data');
    XLSX.writeFile(workbook, 'template-impor-data-siswa.xlsx');
  }, []);

  const handleChangeFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt?.target?.result;
        if (!(result instanceof ArrayBuffer)) return;

        const workbook = XLSX.read(result, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const raw: DataExcelInterface[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const normalized: NormalizedDataExcelInterface[] = raw.map((row) => ({
          name: row.Nama || '',
          identityNumber: row.NIS?.toString() || '',
          class: row.Kelas || '',
          parentId: '',
        }));

        setDataImport(normalized);

        onParsed?.(normalized);
      };

      reader.readAsArrayBuffer(file);
    },
    [onParsed]
  );

  const handleImport = useCallback(async () => {
    try {
      isLoading.onTrue();

      const results = await Promise.allSettled(
        dataImport.map((d) =>
          createStudent({
            name: d.name,
            identityNumber: d.identityNumber,
            class: d.class,
            nameLowercase: d.name.toLowerCase(),
            parentId: d.parentId,
          })
        )
      );

      const failed = results.filter((r) => r.status === 'rejected');

      if (failed.length > 0) {
        enqueueSnackbar(`${failed.length} data gagal ditambahkan`, { variant: 'error' });
      } else {
        enqueueSnackbar('Semua siswa berhasil ditambahkan');
      }

      isShowDialog.onFalse();
      setDataImport([]);
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' });
      console.error(error);
    } finally {
      isLoading.onFalse();
    }
  }, [dataImport, enqueueSnackbar, isLoading, isShowDialog, createStudent]);

  return (
    <>
      <Button
        onClick={isShowDialog.onTrue}
        variant="outlined"
        className="flex items-center justify-center gap-2 rounded-xl border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-700 transition-all hover:border-amber-300 hover:bg-amber-100"
      >
        <Icon icon="solar:import-linear" className="size-5" />
        <span className="font-medium">Impor</span>
      </Button>

      <DialogGeneral state={isShowDialog} centered className="p-6 md:w-[500px]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-1">Import Excel</p>

            <h2 className="mt-1 text-2xl font-bold text-slate-800">Impor Data Siswa</h2>

            <p className="mt-1 text-sm text-slate-500">Upload file Excel sesuai template yang telah disediakan.</p>
          </div>

          <Button onClick={handleDownloadTemplate} variant="gost" className="flex flex-row items-center gap-1 text-primary-1 hover:text-primary-2">
            <Icon icon="solar:download-minimalistic-linear" className="mr-1" />
            <span>Template</span>
          </Button>
        </div>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-8 transition hover:border-primary-1 hover:bg-primary-1/5">
          <Icon icon="solar:cloud-upload-bold" width={42} className="text-primary-1" />

          <div className="text-center">
            <p className="font-medium text-slate-700">Pilih file Excel</p>

            <p className="text-sm text-slate-500">XLSX, XLS, atau CSV</p>
          </div>

          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleChangeFile} className="hidden" />
        </label>

        {dataImport.length > 0 && (
          <Button onClick={handleImport} variant="outlined" disabled={!dataImport.length || isLoading.value} className="mt-5 flex w-full flex-row items-center justify-center gap-2">
            <Icon icon="lets-icons:import-fill" className="size-5" />
            <span>Impor</span>
          </Button>
        )}
      </DialogGeneral>
    </>
  );
}

function RenderExport({ studentsList, usersList }: { studentsList: StudentInterface[]; usersList: UserInterface[] }) {
  const userMap = useMemo(() => new Map<string, UserInterface>((usersList ?? []).map((u) => [u.id, u])), [usersList]);

  const exportToExcel = useCallback(() => {
    const data = studentsList.map((s) => ({
      Nama: s.name,
      NIS: s.identityNumber,
      Kelas: s.class,
      'Wali Siswa': userMap.get(s.parentId)?.name,
      Dibuat: fDate(s.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'data');
    XLSX.writeFile(workbook, 'data-siswa.xlsx');
  }, [studentsList, userMap]);

  return (
    <Button
      onClick={() => exportToExcel()}
      variant="outlined"
      className="flex items-center justify-center gap-2 rounded-xl border-emerald-200 bg-emerald-50 px-4 py-2.5 text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100"
    >
      <Icon icon="solar:export-linear" className="size-5" />
      <span className="font-medium">Ekspor</span>
    </Button>
  );
}

export default StudentFilter;
