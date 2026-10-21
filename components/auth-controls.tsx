"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function AuthControls() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <span className="auth-setup">Sign-in setup required</span>;
  return <div className="auth-controls"><SignedOut><Link className="sign-in-button" href="/sign-in">Sign in</Link><Link className="sign-up-button" href="/sign-up">Sign up</Link></SignedOut><SignedIn><Link className="dashboard-link" href="/dashboard">Dashboard</Link><UserButton /></SignedIn></div>;
}
