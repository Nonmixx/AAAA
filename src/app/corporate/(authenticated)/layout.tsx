import { CorporateAuthLayout } from '../../components/layouts/CorporateAuthLayout';

export default function CorporateAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CorporateAuthLayout>{children}</CorporateAuthLayout>;
}
