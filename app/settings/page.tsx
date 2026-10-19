import { Suspense } from "react";
import IncomeSettingsForm from "@/components/IncomeSettingsForm";
import LoadingState from "@/components/LoadingState";
import { requireUserId } from "@/lib/auth";
import { getIncomeSettings } from "@/lib/settings";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <h1 className="font-serif text-3xl font-semibold">Settings</h1>
      <p className="mt-2 text-ink-muted">
        Add your income and each item will also show how long you&apos;d work to pay for it.
      </p>
      <div className="mt-8">
        <Suspense fallback={<LoadingState />}>
          <SettingsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function SettingsContent() {
  const userId = await requireUserId();
  const settings = await getIncomeSettings(userId);
  return <IncomeSettingsForm initial={settings} />;
}
