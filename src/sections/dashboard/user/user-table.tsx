import React, { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { ColumnDef, RowSelectionState, SortingState } from '@tanstack/react-table';
// context
import { UseUserContextProps } from '/src/context/user/user-provider';
// routes
import { paths } from '/src/routes/paths';
// hooks
import { UseDatabaseUserInterface } from '/src/hooks/use-database-user';
// interfaces
import { StatusUserType, UserInterface } from '/src/interfaces/user';
// utils
import { fDate } from '/src/utils/format-time';
// components
import { Button } from '/src/components/button';
import { DataTable } from '/src/components/table';
import { useSnackbar } from '/src/components/snackbar';
import { DialogConfirm } from '/src/components/dialog';

// ----------------------------------------------------------------------

interface UserTableProps {
  users: UseDatabaseUserInterface['users'];
  usersList: UseDatabaseUserInterface['usersList'];
  page: UseDatabaseUserInterface['page'];
  perPage: UseDatabaseUserInterface['perPage'];
  totalCount: UseDatabaseUserInterface['totalCount'];
  isLoadingUsers: UseDatabaseUserInterface['isLoadingUsers'];
  onUpdate: UseUserContextProps['onUpdate'];
  onDelete: UseUserContextProps['onDelete'];
  currentUserId: string | undefined;
  onNext: UseDatabaseUserInterface['nextPage'];
  onPrev: UseDatabaseUserInterface['prevPage'];
  subscribePage: UseDatabaseUserInterface['subscribePage'];
}

// ----------------------------------------------------------------------

const roleMap = new Map<string, string>([
  ['admin', 'Admin'],
  ['teacher', 'Guru'],
  ['parent', 'Wali Siswa'],
]);

// ----------------------------------------------------------------------

const UserTable: React.FC<UserTableProps> = ({ users: loadUsers, usersList, page, perPage, totalCount, isLoadingUsers, onUpdate, onDelete, currentUserId, onNext, onPrev, subscribePage }) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { enqueueSnackbar } = useSnackbar();

  const getNextStatus = useCallback((status: StatusUserType) => (status === 'active' ? 'inactive' : 'active'), []);

  const handleToggleStatus = useCallback(
    async (id: string, status: StatusUserType) => {
      if (!id) return;

      try {
        const newStatus = getNextStatus(status);
        await onUpdate(id, { status: newStatus });
        enqueueSnackbar('Status berhasil diubah');
      } catch (error: any) {
        enqueueSnackbar(error.message, { variant: 'error' });
        console.error(error);
      }
    },
    [enqueueSnackbar, getNextStatus, onUpdate]
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
          accessorKey: 'email',
          header: 'Email',
          cell: (info: any) => (
            <div className="max-w-[240px] truncate" title={info.getValue()}>
              {info.getValue()}
            </div>
          ),
        },
        {
          accessorKey: 'role',
          header: 'Peranan',
          cell: (info: any) => <div className="inline-block w-full rounded bg-neutral-100 px-2 py-0.5 text-center text-xs">{roleMap.get(info.getValue())}</div>,
        },
        {
          accessorKey: 'status',
          header: 'Status',
          cell: (info: any) => (
            <div data-tip={info.getValue() === 'active' ? 'Aktif' : 'Nonaktif'} className="tooltip flex items-center justify-center">
              <input type="checkbox" onChange={() => handleToggleStatus(info.row.original.id, info.getValue())} checked={info.getValue() === 'active'} className="primary toggle toggle-success" />
            </div>
          ),
        },
        {
          accessorKey: 'createdAt',
          header: 'Dibuat',
          cell: (info: any) => <div className="text-center">{fDate(info.getValue(), 'dd MMM yyyy')}</div>,
        },
      ] as ColumnDef<UserInterface>[],
    [handleToggleStatus]
  );

  const selectedUserIds = useMemo(
    () =>
      Object.entries(rowSelection)
        .filter(([, isSelected]) => isSelected)
        .map(([id]) => id),
    [rowSelection]
  );

  const selectedCount = selectedUserIds.length;

  const userStatusMap = useMemo(() => new Map((usersList || []).map((user) => [user.id, user.status])), [usersList]);

  const handlePerPageChange = useCallback(
    (pp: number) => {
      loadUsers({ perPage: pp });
    },
    [loadUsers]
  );

  const handlePageChange = useCallback(
    (p: number) => {
      if (p === page + 1) onNext();
      else if (p === page - 1) onPrev();
      else subscribePage(p);
    },
    [onNext, onPrev, page, subscribePage]
  );

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleDeleteUser = useCallback(
    async (user: UserInterface) => {
      if (user.id === currentUserId) {
        enqueueSnackbar('Anda tidak dapat menghapus akun yang sedang digunakan.', { variant: 'error' });
        return;
      }

      try {
        await onDelete(user.id, user.authId);
        enqueueSnackbar(`Pengguna ${user.name} berhasil dihapus.`);
      } catch (error) {
        console.error(error);
        enqueueSnackbar(error instanceof Error ? error.message : 'Pengguna gagal dihapus.', { variant: 'error' });
      }
    },
    [currentUserId, enqueueSnackbar, onDelete]
  );

  const handleDeleteSelected = useCallback(async () => {
    const skippedCount = selectedUserIds.filter((id) => id === currentUserId).length;
    const deletableUsers = selectedUserIds
      .filter((id) => id !== currentUserId)
      .map((id) => usersList.find((user) => user.id === id))
      .filter((user): user is UserInterface => user !== undefined);
    const failedIds = selectedUserIds.filter((id) => id !== currentUserId && !usersList.some((user) => user.id === id));

    if (deletableUsers.length === 0) {
      if (failedIds.length > 0) {
        enqueueSnackbar('Data sebagian pengguna yang dipilih tidak tersedia di halaman ini. Pilih ulang pengguna tersebut.', { variant: 'error' });
        return;
      }
      enqueueSnackbar('Tidak ada pengguna yang dapat dihapus. Akun yang sedang digunakan tidak dapat dihapus.', { variant: 'error' });
      return;
    }

    const results = await Promise.allSettled(deletableUsers.map((user) => onDelete(user.id, user.authId)));
    let successCount = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount += 1;
      } else {
        failedIds.push(deletableUsers[index].id);
        console.error(`Gagal menghapus pengguna ${deletableUsers[index].id}:`, result.reason);
      }
    });

    if (successCount > 0) enqueueSnackbar(`${successCount} pengguna berhasil dihapus.`);
    if (failedIds.length > 0) enqueueSnackbar(`${failedIds.length} pengguna gagal dihapus.`, { variant: 'error' });
    if (skippedCount > 0) enqueueSnackbar('Akun yang sedang digunakan tidak dapat dihapus.', { variant: 'warning' });

    const nextSelection: RowSelectionState = {};
    failedIds.forEach((id) => {
      nextSelection[id] = true;
    });
    setRowSelection(nextSelection);
  }, [currentUserId, enqueueSnackbar, onDelete, selectedUserIds, usersList]);

  const handleToggleStatusSelected = useCallback(async () => {
    if (selectedUserIds.length === 0) return;

    try {
      const results = await Promise.allSettled(
        selectedUserIds.map((id) => {
          const currentStatus = userStatusMap.get(id);
          if (!currentStatus) return Promise.reject(new Error('Status user tidak ditemukan'));
          return onUpdate(id, { status: getNextStatus(currentStatus) });
        })
      );

      const failedIds: string[] = [];
      const successCount = results.reduce((acc, result, idx) => {
        if (result.status === 'fulfilled' && result.value) return acc + 1;
        failedIds.push(selectedUserIds[idx]);
        return acc;
      }, 0);

      if (successCount > 0) enqueueSnackbar(`${successCount} pengguna berhasil diubah statusnya`);
      if (failedIds.length > 0) enqueueSnackbar(`${failedIds.length} pengguna gagal diubah statusnya`, { variant: 'error' });

      const nextSelection: RowSelectionState = {};
      failedIds.forEach((id) => {
        nextSelection[id] = true;
      });
      setRowSelection(nextSelection);
    } catch (error: any) {
      console.error(error);
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  }, [enqueueSnackbar, getNextStatus, onUpdate, selectedUserIds, userStatusMap]);

  return (
    <>
      {selectedCount > 0 && (
        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-primary-1/20 bg-gradient-to-r from-primary-1/5 to-primary-2/10 p-4 shadow-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-1 text-white">
              <Icon icon="solar:users-group-rounded-bold" width={24} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Aksi Massal</p>

              <p className="font-semibold text-slate-800">
                <span className="text-primary-1">{selectedCount}</span> pengguna dipilih
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DialogConfirm
              label={
                <div className="flex items-center gap-2">
                  <Icon icon="solar:refresh-circle-bold" width={18} />
                  <span>Ubah Status</span>
                </div>
              }
              title={`Konfirmasi ubah status ${selectedCount} pengguna`}
              action={handleToggleStatusSelected}
            />

            <DialogConfirm
              label={
                <div className="flex items-center gap-2 text-red-600">
                  <Icon icon="solar:trash-bin-trash-bold" width={18} />
                  <span>Hapus Pengguna</span>
                </div>
              }
              title={`Hapus ${selectedCount} pengguna yang dipilih? Akun yang sedang digunakan tidak akan dihapus.`}
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
        data={usersList || []}
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
        isLoading={isLoadingUsers}
        rowActions={(row) => (
          <div className="mx-auto flex w-[140px] justify-center gap-3">
            <Button component="RouterLink" href={paths.dashboard.user.update(row.id)} variant="gost" data-tip="Edit" className="tooltip">
              <Icon icon="mdi:pencil" width={24} className="tooltip" />
            </Button>

            <Button component="RouterLink" href={paths.dashboard.user.detail(row.id)} variant="gost" data-tip="Detail" className="tooltip">
              <Icon icon="mdi:eye" width={24} className="tooltip" />
            </Button>

            {row.id !== currentUserId && (
              <DialogConfirm
                label={
                  <span data-tip="Hapus" className="tooltip text-red-600">
                    <Icon icon="solar:trash-bin-trash-bold" width={22} />
                  </span>
                }
                title={`Hapus akun ${row.name}? Pengguna ini tidak akan dapat masuk lagi.`}
                action={() => handleDeleteUser(row)}
              />
            )}
          </div>
        )}
      />
    </>
  );
};

export default UserTable;
