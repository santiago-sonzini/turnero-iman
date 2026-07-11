import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import SingIn from "./signin"
import SignUp from "./signup"




export function AuthTabs() {
  return (
    <Tabs defaultValue="signin" className="sm:w-[350px] md:w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Inicia Sesion</TabsTrigger>
        <TabsTrigger value="signup">Registro</TabsTrigger>
      </TabsList>
      <TabsContent value="signin">
        <Card>
          <CardHeader>
            <CardTitle>Inicia Sesion</CardTitle>
            <CardDescription>
            Inicia sesion con tu cuenta de email y contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <SingIn/>
          </CardContent>
          
        </Card>
      </TabsContent>
      <TabsContent value="signup">
        <Card>
          <CardHeader>
            <CardTitle>Registro</CardTitle>
            <CardDescription>
              Crea una cuenta de email y contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <SignUp/>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
