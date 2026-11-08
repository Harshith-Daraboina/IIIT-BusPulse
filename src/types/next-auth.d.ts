import 'next-auth';
declare module 'next-auth' {
  interface User {
    role: 'ADMIN' | 'DRIVER' | 'STUDENT';
  }
  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'DRIVER' | 'STUDENT';
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
