"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { login, signup } from "@/app/actions/auth";
import { z } from "zod";
import { useState } from "react";
//import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from "@/components/ui/loading";

export const formSchema = z.object({
  negocio: z.string().min(2, { message: "Contanos el nombre de tu negocio" }),
  email: z.string().email({ message: "Ingresá un email válido" }),
  password: z.string().min(8, {
    message: 'La clave tiene que tener al menos 8 caracteres.',
  }),
});

export type UserFormValue = z.infer<typeof formSchema>;


export default function SignUp() {
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState<any>(false)
  const router = useRouter()

   

  const [aviso, setAviso] = useState<string | null>(null)

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      negocio: '',
      email: '',
      password: '',
    },
  });


  const onSubmit = async (values: UserFormValue) => {
    setLoading(true)
    const res = await signup(values)
    // signup redirige a /onboarding si hay sesión; si devuelve algo es un
    // error o el aviso de "confirmá tu email".
    if (res && res.status !== 200) {
      setError(res.message)
      setAviso(null)
    } else if (res) {
      setError(null)
      setAviso(res.message)
    }
    setLoading(false)
  };


  return (
    <>


      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 w-full"
        >
          <FormField
            control={form.control}
            name="negocio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de tu negocio</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Ej: Almacén Don Luis"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Ingresa tu email..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="*********"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button disabled={loading}
            className="ml-auto w-full mt-6" type="submit">
            {!loading ? "Crear mi cuenta" : <LoadingSpinner />}
          </Button>
          <p className="mt-4 text-red-500 text-sm font text-center" >
            {error}
          </p>
          {aviso && (
            <p className="mt-2 text-sm text-center text-muted-foreground">
              {aviso}
            </p>
          )}
        </form>
      </Form>



    </>
  );
}
