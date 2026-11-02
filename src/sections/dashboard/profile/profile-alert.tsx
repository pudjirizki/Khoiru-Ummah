import React from 'react';
import { Icon } from '@iconify/react';

// ----------------------------------------------------------------------

const ProfileAlert: React.FC = () => {
  return (
    <div className="my-5 flex flex-row items-center gap-2 rounded-md bg-red-600 p-3">
      <Icon icon="fluent-mdl2:alert-solid" width={20} color="#FFF" />
      <p className="flex-1 text-white">Peranan dibutuhkan untuk memvalidasi akun anda.</p>
    </div>
  );
};

export default ProfileAlert;
