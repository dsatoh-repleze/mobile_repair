import ECLayout from '@/components/layouts/ec-layout';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ECLayout>{children}</ECLayout>;
}
