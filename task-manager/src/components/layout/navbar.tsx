"use client";

import { useRouter } from "next/navigation";
import { LogOut, CheckSquare } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCredentials } from "@/store/auth-slice";
import { authService } from "@/services/auth-service";
import Button from "@/components/ui/button";

export default function Navbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      dispatch(clearCredentials());
      router.push("/login");
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-600 font-semibold text-lg">
          <CheckSquare className="w-5 h-5" />
          TaskManager
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-gray-600 hidden sm:block">
              {user.name}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
