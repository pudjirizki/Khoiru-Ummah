import React, { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Icon } from '@iconify/react';
// context
import { UseUserContextProps } from '/src/context/user/user-provider';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { useDebounce } from '/src/hooks/use-debounce';
// interfaces
import { RoleUserType, StatusUserType, UserInterface } from '/src/interfaces/user';
// utils
import { fDate } from '/src/utils/format-time';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { DialogGeneral } from '/src/components/dialog';
import { InputField, SelectField } from '/src/components/form';
//
import { FilterInterface } from './view/user-view';

// ----------------------------------------------------------------------
interface OptionSelectInterface {
  label: string;
  value: string;
}

interface DataExcelInterface {
  Nama: string;
  Email: string;
  'No Telepon': string;
  Peranan: string;
  status?: StatusUserType;
  Password?: string;
}

interface NormalizedDataExcelInterface {
  name: string;
  phoneNumber: string;
  role: RoleUserType;
  email: string;
  password: string;
}

interface UserFilterProps {
  usersList: UserInterface[];
  filters: FilterInterface;
  setFilters: React.Dispatch<React.SetStateAction<FilterInterface>>;
  onRegister: UseUserContextProps['onRegister'];
}

// ----------------------------------------------------------------------

const roleOptions: OptionSelectInterface[] = [
  { label: 'Semua', value: '' },
  { label: 'Admin', value: 'admin' },
  { label: 'Guru', value: 'teacher' },
  { label: 'Wali Siswa', value: 'parent' },
];

const roleMap = new Map<string, string>([
  ['admin', 'Admin'],
  ['teacher', 'Guru'],
  ['parent', 'Wali Siswa'],
]);

const reverseRoleMap = new Map<string, string>([
  ['Admin', 'admin'],
  ['Guru', 'teacher'],
  ['Wali Siswa', 'parent'],
]);

// ----------------------------------------------------------------------

const UserFilter: React.FC<UserFilterProps> = ({ usersList, filters, setFilters, onRegister }) => {
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
              placeholder="Cari nama pengguna..."
              inputClassname="pl-12 py-3 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="min-w-[180px]">
            <SelectField
              value={roleOptions.find((r) => r.value === filters.role)}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  role: e?.value as RoleUserType,
                }))
              }
              options={roleOptions}
              placeholder="Semua Peranan"
              isSearchable={false}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RenderImport onRegister={onRegister} />
          <RenderExport usersList={usersList} />
        </div>
      </div>
    </div>
  );
};

function RenderImport({ onParsed, onRegister }: { onParsed?: (data: NormalizedDataExcelInterface[]) => void; onRegister: UseUserContextProps['onRegister'] }) {
  const [dataImport, setDataImport] = useState<NormalizedDataExcelInterface[]>([]);

  const isShowDialog = useBoolean(false);

  const isLoading = useBoolean(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleDownloadTemplate = useCallback(() => {
    const data: DataExcelInterface[] = [
      {
        Nama: 'Nama Admin',
        Email: 'admin@gmail.com',
        'No Telepon': '0812345678',
        Peranan: 'Admin',
        Password: '12345678',
      },
      {
        Nama: 'Nama Guru',
        Email: 'guru@gmail.com',
        'No Telepon': '0812345678',
        Peranan: 'Guru',
        Password: '12345678',
      },
      {
        Nama: 'Nama Wali Siswa',
        Email: 'walisiswa@gmail.com',
        'No Telepon': '0812345678',
        Peranan: 'Wali Siswa',
        Password: '12345678',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'data');
    XLSX.writeFile(workbook, 'template-impor-data-pengguna.xlsx');
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
          phoneNumber: row['No Telepon']?.toString() || '',
          role: (reverseRoleMap.get(row.Peranan) || '') as RoleUserType,
          email: row.Email || '',
          password: row.Password || '',
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
          onRegister({
            name: d.name,
            email: d.email,
            phoneNumber: d.phoneNumber,
            nameLowercase: d.name.toLowerCase(),
            password: d.password,
            status: 'active',
            role: d.role,
          })
        )
      );

      const failed = results.filter((r) => r.status === 'rejected');

      if (failed.length > 0) {
        enqueueSnackbar(`${failed.length} data gagal ditambahkan`, { variant: 'error' });
      } else {
        enqueueSnackbar('Semua pengguna berhasil ditambahkan');
      }

      isShowDialog.onFalse();
      setDataImport([]);
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' });
      console.error(error);
    } finally {
      isLoading.onFalse();
    }
  }, [dataImport, enqueueSnackbar, isLoading, isShowDialog, onRegister]);

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
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center md:gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-1/10">
              <Icon icon="solar:upload-bold" width={28} className="text-primary-1" />
            </div>

            <div>
              <p className="text-sm uppercase tracking-widest text-slate-400">Import Data</p>

              <h2 className="font-poppins text-2xl font-bold text-slate-800">Impor Pengguna</h2>
            </div>
          </div>

          <Button onClick={handleDownloadTemplate} variant="gost" className="rounded-xl bg-slate-100 px-4 py-2 text-slate-600 hover:bg-slate-200">
            <Icon icon="solar:file-download-bold" width={18} />
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

function RenderExport({ usersList }: { usersList: UserInterface[] }) {
  const exportToExcel = useCallback(() => {
    const data = usersList.map((u) => ({
      Nama: u.name,
      Email: u.email,
      'No Telepon': u.phoneNumber,
      Peranan: roleMap.get(u.role),
      Dibuat: fDate(u.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'data');
    XLSX.writeFile(workbook, 'data-pengguna.xlsx');
  }, [usersList]);

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

export default UserFilter;
