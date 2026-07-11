import { redirect } from "next/navigation";
import getUserServer from "@/lib/user";
export default async function AppLayout({children}:{children:React.ReactNode}){const user=await getUserServer();if(!user?.userDb)redirect("/auth");return children}
