import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { LogIn } from "lucide-react";
import Fileupload from "@/components/Fileupload";

export default async function Home() {
  const { userId } = await auth();
  const isAuth = !!userId;
  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-lime-100 via-emerald-100 to-fuchsia-200">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center">
            <h1 className="mr-4 text-5xl font-semibold">Chat with any PDF</h1>
            <UserButton afterSwitchSessionUrl="/" />
          </div>
          <div className="flex mt-2">
            {isAuth && <Button>Go to Chats</Button>}
          </div>

          <p className="max-w-xl mt-4 text-lg text-center text-slate-600 ">
            Join millions of students, researchers, and professionals to
            instantly answer questions and understand research with AI.
          </p>

          <div className="w-full mt-4 ">
            {isAuth ? (
              <Fileupload />
            ) : (
              <Link href="/sign-in">
                <Button className="ml-52">
                  Login to get started
                  <LogIn className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
