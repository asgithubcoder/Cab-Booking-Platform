import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <main className="auth-page"><div className="auth-card"><Link className="account-brand" href="/"><span className="brand-mark">d</span>drift<span>.</span></Link><h1>Sign in is almost ready</h1><p>Add your Clerk publishable and secret keys to <code>.env.local</code>, then restart the app.</p><Link className="account-action" href="/">Back to booking</Link></div></main>;
  }
  return <main className="auth-page"><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" /></main>;
}
