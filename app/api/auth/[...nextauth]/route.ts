import NextAuth from 'next-auth'
import FacebookProvider from 'next-auth/providers/facebook'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "public_profile,email"
        }
      }
    })
  ],
  session: {
    strategy: 'database', // PENTING: Harus database untuk PrismaAdapter
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Debug: Log semua data yang diterima dari Facebook
      console.log('=== FACEBOOK LOGIN DEBUG ===');
      console.log('User data:', JSON.stringify(user, null, 2));
      console.log('Account data:', JSON.stringify(account, null, 2));
      console.log('Profile data:', JSON.stringify(profile, null, 2));
      
      try {
        // Manual check database connection
        const userCount = await prisma.user.count();
        console.log('Current user count in database:', userCount);
        
        // Check if user already exists
        if (user.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          });
          console.log('Existing user found:', existingUser);
        }
        
        console.log('SignIn callback completed successfully');
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return true; // Tetap izinkan login meski ada error
      }
    },
    session: async ({ session, user }) => {
      // Untuk database strategy, user sudah tersedia
      if (session?.user && user?.id) {
        session.user.id = user.id
      }
      return session
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      // Redirect ke admin page setelah login Facebook
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/admin`;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
})

export { handler as GET, handler as POST }