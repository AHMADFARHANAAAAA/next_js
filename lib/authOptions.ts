import type { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Ensure connection before query
          await prisma.$connect();

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { 
              accounts: true
            }
          });

          if (!user) {
            throw new Error('No account found with this email address');
          }

          // Check if user was registered via OAuth (no password)
          if (!user.password && user.accounts.length > 0) {
            const providers = user.accounts.map(acc => acc.provider).join(' and ');
            throw new Error(`This email is registered via ${providers}. Please use the ${providers} login button instead.`);
          }

          if (!user.password) {
            throw new Error('No password set for this account. Please contact support.');
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            throw new Error('Incorrect password');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            schoolId: user.schoolId,
          };
        } catch (error) {
          console.error('Credentials authorization error:', error);
          throw error; // Re-throw to preserve the specific error message
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  
  session: {
    strategy: 'jwt' as const,
  },
  
  callbacks: {
    async signIn({ user, account }) {
      // Skip database operations for credentials provider
      if (account?.provider === 'credentials') {
        return true;
      }

      // Handle Google OAuth provider with email validation
      if (account?.provider === 'google' && user.email) {
        try {
          // Ensure connection before query
          await prisma.$connect();

          // Check if user already exists in database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true, school: true }
          });

          if (!existingUser) {
            // Email belum terdaftar - tolak login
            console.log(`? Google login rejected: Email ${user.email} not registered`);
            // Return false akan trigger error page dengan parameter error
            return '/auth/error?error=EmailNotRegistered';
          }

          // Email sudah terdaftar - update user info untuk session
          user.id = existingUser.id;
          user.role = existingUser.role;
          user.schoolId = existingUser.schoolId;
          user.name = existingUser.name || user.name;
          
          // Cek apakah Google account sudah ter-link
          const hasGoogleAccount = existingUser.accounts.some(
            acc => acc.provider === 'google'
          );

          if (!hasGoogleAccount) {
            // Link Google account ke user existing
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              }
            });
            console.log(`? Google account linked to existing user: ${user.email}`);
          }

          return true;
        } catch (error) {
          console.error('Google sign in error:', error);
          return false;
        }
      }

      // Handle other OAuth providers
      if (account?.provider && user.email) {
        try {
          // Ensure connection before query
          await prisma.$connect();

          // Check if user already exists
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          });

          if (!dbUser) {
            // Create new user with default USER role
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
                role: 'USER', // Default role untuk user baru
              },
              include: { accounts: true }
            });
          } else {
            // Check if user was registered manually (has password but no OAuth accounts)
            const hasPassword = !!dbUser.password;
            const hasOAuthAccounts = dbUser.accounts.length > 0;
            
            if (hasPassword && !hasOAuthAccounts) {
              // User registered manually, need to link OAuth account
            }
          }

          // Check if this provider account already exists
          const existingAccount = dbUser.accounts.find(
            acc => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
          );

          if (!existingAccount) {
            // Create account link
            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              }
            });
          }

          return true;
        } catch (error) {
          console.error('OAuth signIn error:', error);
          return true; // Allow sign in even if DB fails
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.schoolId = user.schoolId;
      }
      
      // Always fetch fresh user data from database to get updated role
      if (token.sub) {
        try {
          // Ensure connection before query
          await prisma.$connect();

          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, schoolId: true }
          });
          
          if (dbUser) {
            token.role = dbUser.role;
            token.schoolId = dbUser.schoolId;
          }
        } catch (error) {
          console.error('Error fetching user role in JWT callback:', error);
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (session?.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
      }
      return session;
    },
  },
  
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  
  debug: process.env.NODE_ENV === 'development',
}

export default authOptions
