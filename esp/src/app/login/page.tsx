'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await signIn('credentials', {
        email: form.get('email'),
        password: form.get('password'),
        redirect: false,
      });
      if (result?.error)
        setError('Unable to sign in. Check your credentials or contact the transport office.');
      else {
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setError('Sign-in service unavailable. Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="login-page">
      <Link href="/" className="brand login-brand">
        <Image
          src="/iiit-logo.png"
          alt="Indian Institute of Information Technology Dharwad"
          width={523}
          height={180}
          className="brand-logo"
          priority
        />
        <span className="brand-text">
          <span className="brand-light">BusPulse</span>
        </span>
      </Link>
      <div className="login-layout">
        <section className="login-form-section">
          <span className="eyebrow">IIIT DHARWAD TRANSPORT</span>
          <h1>Admin sign in.</h1>
          <p className="muted">Sign in to manage IIIT Dharwad transportation.</p>
          <form onSubmit={submit} className="login-form">
            <label>
              Admin email
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  name="email"
                  type="email"
                  placeholder="you@iiitdwd.ac.in"
                  required
                  autoComplete="username"
                />
              </div>
            </label>
            <label>
              Password
              <div className="input-with-icon">
                <LockKeyhole size={17} />
                <input
                  name="password"
                  type={show ? 'text' : 'password'}
                  minLength={8}
                  maxLength={128}
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <Button disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
              <ArrowRight size={17} />
            </Button>
          </form>
          <p className="login-contact">Student bus tracking is public. No account is required.</p>
          <Link href="/" className="demo-login-link">
            Back to tracking
            <ArrowRight size={16} />
          </Link>
        </section>
        <div className="login-photo">
          <div>
            <span>THE CAMPUS IS CLOSER THAN YOU THINK.</span>
            <h2>
              Good mornings
              <br />
              start with a good ride.
            </h2>
            <p>Your next chapter is just a commute away.</p>
          </div>
        </div>
      </div>
      <footer className="login-footer">
        Smart College Bus Tracking System · IIIT Dharwad
      </footer>
    </main>
  );
}
