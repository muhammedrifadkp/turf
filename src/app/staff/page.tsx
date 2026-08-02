import React from 'react';
import StaffManager from '@/components/staff/StaffManager';

export const metadata = {
  title: 'Staff Assignment | Turf Management SaaS',
  description: 'Admin Portal to assign duty staff accounts, manage credentials, and reset passwords.',
};

export default function StaffPage() {
  return <StaffManager />;
}
