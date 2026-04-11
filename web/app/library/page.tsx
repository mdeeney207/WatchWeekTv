// web/app/library/page.tsx
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";
import LibraryClient from "./LibraryClient";

export default function LibraryPage() {
  return (
    <PageShell>
      <main className="pb-14">
        <PageWrap className="py-10">
          <LibraryClient />
        </PageWrap>
      </main>
    </PageShell>
  );
}