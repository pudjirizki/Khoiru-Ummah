import React, { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
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
}

// ----------------------------------------------------------------------

const StudentTable: React.FC<StudentTableProps> = ({ students: loadStudents, studentsList, page, perPage, totalCount, isLoading, onNext, onPrev, subscribePage }) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const { allUsersCache } = useDatabaseUser();

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
          size: 250,
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
          size: 250,
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

  return (
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
      isLoading={isLoading}
      rowActions={(row) => (
        <div className="mx-auto flex w-[100px] justify-center gap-3">
          <Button component="RouterLink" href={paths.dashboard.student.detail(row.id)} variant="gost" data-tip="Detail" className="tooltip">
            <Icon icon="mdi:eye" width={24} className="tooltip" />
          </Button>
        </div>
      )}
    />
  );
};

export default StudentTable;
