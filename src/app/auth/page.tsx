import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthTabs } from "@/components/forms/auth/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Login",
  description: "",
};

export default function AuthenticationPage() {
  return (
    <div className="relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center mt-10 text-lg font-medium gap-x-4">
          
        <Link
            href={"/"}
          >
           <Image
           height={50}
           width={50}
           className="bg-white rounded-md pt-1 border-black border-2"
      priority
      src={'/favicon.png'}
      alt="Logo"
    />
          </Link>
          Imán
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            
          </blockquote>
        </div>
      </div>
      <div className="p-4  h-full flex items-center ">
        <div className="mx-auto h-full flex w-full flex-col justify-center space-y-6 sm:w-[350px] ">
          
          <AuthTabs />
          {/* <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p> */}
        </div>
      </div>
    </div>
  );
}
