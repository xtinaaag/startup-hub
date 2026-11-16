import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { authConfig } from './auth.config';

// School email domains allowed to sign in (comma-separated).
const allowedDomains = () =>
  (process.env.ALLOWED_EMAIL_DOMAINS || 'columbia.edu,gsb.columbia.edu')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

export const isAllowedEmail = (email: string) => {
  const domain = email.toLowerCase().split('@')[1] || '';
  return allowedDomains().some((d) => domain === d);
};

export const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    ...authConfig.callbacks,
    // Google sign-in: only accept verified addresses on a school domain.
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true;
      return !!(profile?.email && profile.email_verified && isAllowedEmail(profile.email));
    },
  },
  providers: [
    // Real verification: Columbia LionMail is Google Workspace, so Google
    // OAuth proves the student controls the address. Enabled when
    // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are set.
    ...(googleEnabled ? [Google] : []),

    // Prototype fallback: shared class password + self-reported school email.
    // NOTE: this does not prove the user owns the email. Fine for a class demo,
    // not for real club-restricted data.
    Credentials({
      credentials: {
        email: { label: 'School email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const password = credentials?.password;
        const email = String(credentials?.email || '').trim().toLowerCase();
        if (!password || password !== process.env.AUTH_PASSWORD) return null;
        if (!isAllowedEmail(email)) return null;
        return { id: email, email, name: email.split('@')[0] };
      },
    }),
  ],
});
