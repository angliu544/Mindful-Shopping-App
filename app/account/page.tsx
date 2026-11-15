import { Suspense } from "react";
import { redirect } from "next/navigation";
import AccountSettings from "@/components/AccountSettings";
import LoadingState from "@/components/LoadingState";
import { requireUserId } from "@/lib/auth";
import { getAccount } from "@/lib/users";

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-[877px] px-4 pb-16 pt-8 sm:pt-[74px]">
      <h1 className="text-[34px] leading-tight text-heading sm:text-[58px]">Account settings</h1>
      <p className="text-2xl text-heading sm:text-[32px]">Update your picture, name, and password.</p>
      <div className="mx-auto mt-8 max-w-[626px] sm:mt-12">
        <Suspense fallback={<LoadingState label="Loading your account…" />}>
          <AccountContent />
        </Suspense>
      </div>
    </div>
  );
}

async function AccountContent() {
  const userId = await requireUserId();
  const account = await getAccount(userId);
  // A session for an account that no longer exists: start again.
  if (!account) redirect("/sign-in");
  return <AccountSettings initial={account} />;
}
