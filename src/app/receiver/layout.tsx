import { ReceiverLayout } from '../components/layouts/ReceiverLayout';

export default function ReceiverGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReceiverLayout>{children}</ReceiverLayout>;
}
