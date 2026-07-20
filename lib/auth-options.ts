import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-posta veya Telefon', type: 'text' },
        password: { label: 'Şifre', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          // E-posta mı telefon mu belirle
          const identifier = credentials.email.trim();
          let user;
          const isPhone = /^\d/.test(identifier) && !identifier.includes('@');
          if (isPhone) {
            // Telefon numarasını normalize et: başındaki 0 ve +90 kaldır
            let phone = identifier.replace(/[\s\-\(\)]/g, '');
            phone = phone.replace(/^\+90/, '');
            phone = phone.replace(/^0/, '');
            user = await prisma.user.findUnique({
              where: { phone },
              include: { sellerProfile: true },
            });
          } else {
            user = await prisma.user.findUnique({
              where: { email: identifier },
              include: { sellerProfile: true },
            });
          }
          if (!user || !user.isActive) return null;
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            sellerStatus: user.sellerProfile?.status ?? null,
            sellerProfileId: user.sellerProfile?.id ?? null,
            hasPaymentMethod: user.hasPaymentMethod ?? false,
            isEmailVerified: user.isEmailVerified ?? false,
            isPhoneVerified: user.isPhoneVerified ?? false,
            hasAcceptedTerms: user.hasAcceptedTerms ?? false,
          } as any;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sellerStatus = user.sellerStatus;
        token.sellerProfileId = user.sellerProfileId ?? null;
        token.hasPaymentMethod = user.hasPaymentMethod;
        token.isEmailVerified = user.isEmailVerified;
        token.isPhoneVerified = user.isPhoneVerified;
        token.hasAcceptedTerms = user.hasAcceptedTerms;
      }
      // Session güncellemesi isteğinde (update() çağrıldığında) DB'den taze değerleri al
      if (trigger === 'update' && token.id) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id },
            include: { sellerProfile: true },
          });
          if (freshUser) {
            token.isEmailVerified = freshUser.isEmailVerified ?? false;
            token.isPhoneVerified = freshUser.isPhoneVerified ?? false;
            token.hasPaymentMethod = freshUser.hasPaymentMethod ?? false;
            token.hasAcceptedTerms = freshUser.hasAcceptedTerms ?? false;
            token.role = freshUser.role;
            token.sellerStatus = freshUser.sellerProfile?.status ?? null;
            token.sellerProfileId = freshUser.sellerProfile?.id ?? null;
          }
        } catch {
          // DB hatasında mevcut token değerlerini koru
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).sellerStatus = token.sellerStatus;
        (session.user as any).sellerProfileId = token.sellerProfileId ?? null;
        (session.user as any).hasPaymentMethod = token.hasPaymentMethod;
        (session.user as any).isEmailVerified = token.isEmailVerified;
        (session.user as any).isPhoneVerified = token.isPhoneVerified;
        (session.user as any).hasAcceptedTerms = token.hasAcceptedTerms;
      }
      return session;
    },
  },
  pages: {
    signIn: '/giris',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 gün oturum süresi
  },
  cookies: process.env.NODE_ENV === 'production' ? {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  } : undefined,
  secret: process.env.NEXTAUTH_SECRET,
};
