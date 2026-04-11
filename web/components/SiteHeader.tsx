import SiteHeaderClient from "@/components/SiteHeaderClient";

export default async function SiteHeader(props: {
  onOpenSearch?: () => void;
  onOpenPlatforms?: () => void;
}) {
  return (
    <SiteHeaderClient
      initialUserId={null}
      initialUserEmail={null}
      {...props}
    />
  );
}