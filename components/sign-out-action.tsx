"use client";
import { SignOutButton } from "@clerk/nextjs";
export function SignOutAction() { return <SignOutButton redirectUrl="/"><button className="sign-out-button">Sign out</button></SignOutButton>; }
