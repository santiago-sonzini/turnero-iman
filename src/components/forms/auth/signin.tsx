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
import { login } from "@/app/actions/auth";
import { z } from "zod";
import { useState } from "react";
//import { useRouter, useSearchParams } from "next/navigation";
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from "@/components/ui/loading";

export const formSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }),
  password: z.string().min(8, {
    message: 'Password must be at least 8 characters.',
  }),
});

export type UserFormValue = z.infer<typeof formSchema>;


export default function SignIn() {
  const router = useRouter();
  
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState<any>(false)

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  


  const onSubmit = async (values: UserFormValue) => {
    setLoading(true)
    const res = await login(values)
    if (res.status !== 200) {
      console.log(error);

      setError(res.message)
    } else {
      setError(null)
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
            disabled={loading}
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
            disabled={loading}
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
            {!loading ? "Continuar" : <LoadingSpinner/>}
          </Button>
          <p className="mt-4 text-red-500 text-sm font-bold text-center" >
            {error}
          </p>
        </form>
      </Form>



    </>
  );
}
