import { Suspense } from "react";
import IncomeSettingsForm from "@/components/IncomeSettingsForm";
import LoadingState from "@/components/LoadingState";
import { requireUserId } from "@/lib/auth";
import { getIncomeSettings } from "@/lib/settings";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[877px] px-4 pb-16 pt-8 sm:pt-[74px]">
      <h1 className="text-[34px] leading-tight text-heading sm:text-[58px]">Income settings</h1>
      <p className="text-2xl text-heading sm:text-[32px]">
        Add your income and each item will also show how long you&apos;d work to pay for it.
      </p>
      <div className="mx-auto mt-8 max-w-[626px] sm:mt-12">
        <Suspense fallback={<LoadingState label="Loading your settings…" />}>
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
