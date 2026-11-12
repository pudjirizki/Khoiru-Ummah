import React, { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { ColumnDef, RowSelectionState, SortingState } from '@tanstack/react-table';
// routes
import { paths } from '/src/routes/paths';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { UseDatabaseStudentInterface } from '/src/hooks/use-database-student';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
// utils
import { fDate } from '/src/utils/format-time';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { DialogConfirm } from '/src/components/dialog';
import { DataTable } from '/src/components/table';

// ----------------------------------------------------------------------

interface StudentTableProps {
  students: UseDatabaseStudentInterface['students'];
  studentsList: UseDatabaseStudentInterface['studentsList'];
  page: UseDatabaseStudentInterface['page'];
  perPage: UseDatabaseStudentInterface['perPage'];
  totalCount: UseDatabaseStudentInterface['totalCount'];
  isLoading: UseDatabaseStudentInterface['isLoading'];
  onNext: UseDatabaseStudentInterface['nextPage'];
  onPrev: UseDatabaseStudentInterface['prevPage'];
  subscribePage: UseDatabaseStudentInterface['subscribePage'];
  onDeleteStudent: UseDatabaseStudentInterface['deleteStudent'];
}

// ----------------------------------------------------------------------

const StudentTable: React.FC<StudentTableProps> = ({ students: loadStudents, studentsList, page, perPage, totalCount, isLoading, onNext, onPrev, subscribePage, onDeleteStudent }) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { allUsersCache, currentUser } = useDatabaseUser();

  const { enqueueSnackbar } = useSnackbar();

  const usersMap = useMemo(() => {
    return new Map(allUsersCache.map((u) => [u.id, u]));
  }, [allUsersCache]);

  const findUserId = useCallback(
    (id?: string | null) => {
      if (!id) return null;
      return usersMap.get(id) ?? null;
    },
    [usersMap]
  );

  const columns = useMemo(
    () =>
      [
        {
          accessorKey: 'name',
          header: 'Nama',
          size: 200,
          cell: (info: any) => <div className="line-clamp-2 font-medium">{info.getValue()}</div>,
        },
        {
          accessorKey: 'identityNumber',
          header: 'NIS',
          size: 200,
          cell: (info: any) => info.getValue(),
        },
        {
          accessorKey: 'class',
          header: 'Kelas',
          size: 100,
          cell: (info: any) => <div className="text-center">{info.getValue()}</div>,
        },

        {
          accessorKey: 'parentId',
          header: 'Wali Siswa',
          size: 200,
          cell: (info: any) => <div className="line-clamp-2">{findUserId(info.getValue())?.name ?? '-'}</div>,
        },
        {
          accessorKey: 'createdAt',
          header: 'Dibuat',
          cell: (info: any) => <div className="text-center">{fDate(info.getValue(), 'dd MMM yyyy')}</div>,
        },
      ] as ColumnDef<StudentInterface>[],
    [findUserId]
  );

  const selectedStudentIds = useMemo(
    () =>
      Object.entries(rowSelection)
        .filter(([, isSelected]) => isSelected)
        .map(([id]) => id),
    [rowSelection]
  );

  const selectedCount = selectedStudentIds.length;

  const handlePerPageChange = useCallback(
    (pp: number) => {
      loadStudents({ perPage: pp });
    },
    [loadStudents]
  );

  const handlePageChange = useCallback(
    (p: number) => {
      if (p === page + 1) onNext();
      else if (p === page - 1) onPrev();
      else subscribePage(p);
    },
    [onNext, onPrev, page, subscribePage]
  );

  const handleDeleteStudent = useCallback(
    async (id: string) => {
      try {
        await onDeleteStudent(id);
        enqueueSnackbar('Siswa berhasil dihapus');
      } catch (error: any) {
        console.error(error);
        enqueueSnackbar(error.message, { variant: 'error' });
      }
    },
    [enqueueSnackbar, onDeleteStudent]
  );

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedStudentIds.length === 0) return;

    try {
      const results = await Promise.allSettled(selectedStudentIds.map((id) => onDeleteStudent(id)));

      const failedIds: string[] = [];
      const successCount = results.reduce((acc, result, idx) => {
        if (result.status === 'fulfilled' && result.value === true) return acc + 1;
        failedIds.push(selectedStudentIds[idx]);
        return acc;
      }, 0);

      if (successCount > 0) enqueueSnackbar(`${successCount} siswa berhasil dihapus`);
      if (failedIds.length > 0) enqueueSnackbar(`${failedIds.length} siswa gagal dihapus`, { variant: 'error' });

      const nextSelection: RowSelectionState = {};
      failedIds.forEach((id) => {
        nextSelection[id] = true;
      });
      setRowSelection(nextSelection);
    } catch (error: any) {
      console.error(error);
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  }, [enqueueSnackbar, onDeleteStudent, selectedStudentIds]);

  return (
    <>
      {selectedCount > 0 && (
        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-red-100/50 p-4 shadow-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500 text-white">
              <Icon icon="solar:users-group-rounded-bold" width={24} />
            </div>

            <div>
              <p className="text-sm text-red-500">Aksi Massal</p>

              <p className="font-semibold text-slate-800">
                <span className="text-red-600">{selectedCount}</span> siswa dipilih
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DialogConfirm
              label={
                <div className="flex items-center gap-2">
                  <Icon icon="solar:trash-bin-trash-bold" width={18} />
                  <span>Hapus Siswa</span>
                </div>
              }
              title={`Konfirmasi penghapusan ${selectedCount} siswa`}
              action={handleDeleteSelected}
            />

            <Button variant="gost" onClick={handleClearSelection} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-600 hover:bg-slate-50">
              <Icon icon="solar:close-circle-bold" width={18} />
              <span>Batal</span>
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={studentsList || []}
        page={page}
        perPage={perPage}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
        sorting={sorting}
        onSortingChange={setSorting}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        rowActions={(row) => (
          <div className="mx-auto flex w-[100px] justify-center gap-3">
            {currentUser?.databaseUsers?.role === 'admin' && (
              <Button component="RouterLink" href={paths.dashboard.student.update(row.id)} variant="gost" data-tip="Edit" className="tooltip">
                <Icon icon="mdi:pencil" width={24} className="tooltip" />
              </Button>
            )}

            <Button component="RouterLink" href={paths.dashboard.student.detail(row.id)} variant="gost" data-tip="Detail" className="tooltip">
              <Icon icon="mdi:eye" width={24} className="tooltip" />
            </Button>

            {currentUser?.databaseUsers?.role === 'admin' && (
              <DialogConfirm
                label={
                  <span data-tip="Hapus" className="tooltip">
                    <Icon icon="mdi:trash" width={24} className="tooltip text-red-500" />
                  </span>
                }
                title={`Konfirmasi penghapusan "${row.name}"`}
                action={() => handleDeleteStudent(row.id)}
              />
            )}
          </div>
        )}
      />
    </>
  );
};

export default StudentTable;
