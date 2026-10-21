import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, CarFront, Clock3, CreditCard, Navigation, ShieldCheck } from "lucide-react";
import { SignOutAction } from "@/components/sign-out-action";

export default async function DashboardPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return <main className="account-page"><section className="account-content"><h1 className="account-title">Set up your<br/><em>account.</em></h1><div className="account-message">Add Clerk keys to .env.local to enable a signed-in dashboard.</div><Link href="/" className="account-action">Back to booking <ArrowRight size={15}/></Link></section></main>;
  }
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard");
  const user = await currentUser();
  const name = user?.firstName ?? user?.username ?? "there";
  const email = user?.primaryEmailAddress?.emailAddress ?? "Signed-in account";
  return <main className="account-page"><header className="account-header"><Link href="/" className="account-brand"><span className="brand-mark"><Navigation size={17} fill="currentColor"/></span>drift<span>.</span></Link><div className="dashboard-user">{email}<SignOutAction/></div></header><section className="account-content"><span className="section-kicker">RIDER DASHBOARD</span><h1 className="account-title">Good to see you,<br/><em>{name}.</em></h1><p className="account-lede">Your rides and account shortcuts, all in one place.</p><div className="dashboard-grid"><Link href="/" className="dashboard-card"><span><CarFront size={20}/></span><strong>Book a ride</strong><small>Choose a pickup and destination</small><ArrowRight size={16}/></Link><Link href="/rides" className="dashboard-card"><span><Clock3 size={20}/></span><strong>My trips</strong><small>See your ride history and status</small><ArrowRight size={16}/></Link><Link href="/driver" className="dashboard-card"><span><Navigation size={20}/></span><strong>Driver portal</strong><small>View and accept open ride requests</small><ArrowRight size={16}/></Link><div className="dashboard-card dashboard-static"><span><CreditCard size={20}/></span><strong>Payments</strong><small>Cards are securely handled by Stripe at checkout</small><ShieldCheck size={16}/></div></div></section></main>;
}
