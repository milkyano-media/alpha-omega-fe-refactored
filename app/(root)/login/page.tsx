import { LoginForm } from "@/components/login-form";

export default function Login() {
  return (
    <main className="flex flex-col gap-20 mt-20">
      <section className="flex flex-col gap-8 h-screen justify-center items-center px-4">
        <LoginForm />
      </section>
    </main>
  );
}
