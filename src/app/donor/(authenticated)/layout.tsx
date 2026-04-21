import { DonorAuthLayout } from '../../components/layouts/DonorAuthLayout';

export default function DonorAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DonorAuthLayout>{children}</DonorAuthLayout>;
}
