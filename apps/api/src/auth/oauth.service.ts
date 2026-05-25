import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Google OAuth 2.0 (Authorization Code flow). No SDK — we call Google's
 * documented endpoints directly.
 *
 *  1. `getAuthorizationUrl()` builds the consent URL we redirect users to.
 *  2. `handleCallback(code)` exchanges the code for tokens, decodes the
 *     id_token claims, and finds-or-creates the user. We auto-link by
 *     verified email (only if Google says `email_verified: true`).
 *
 * Env required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
 *               OAUTH_FRONTEND_SUCCESS_URL (where to land the browser after).
 */
@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  private get clientId() {
    return this.config.get<string>('GOOGLE_CLIENT_ID') || '';
  }
  private get clientSecret() {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET') || '';
  }
  private get redirectUri() {
    return (
      this.config.get<string>('GOOGLE_REDIRECT_URI') ||
      `${this.config.get('BACKEND_URL') || 'http://localhost:1000'}/auth/oauth/google/callback`
    );
  }
  private get frontendSuccessUrl() {
    return (
      this.config.get<string>('OAUTH_FRONTEND_SUCCESS_URL') ||
      `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/auth/callback`
    );
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Caller passes an unguessable `state` (which we also stash in a short-lived
   * signed JWT so we can verify on callback without server-side session state).
   */
  getAuthorizationUrl(args: { next?: string } = {}) {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Google sign-in isn’t configured on the server yet. Try again later or use your email and password.',
      );
    }
    const stateToken = this.jwt.sign(
      { kind: 'oauth_state', nonce: randomBytes(16).toString('hex'), next: args.next || '' },
      { expiresIn: '10m' },
    );
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      include_granted_scopes: 'true',
      prompt: 'select_account',
      state: stateToken,
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    };
  }

  async handleCallback(code: string, state: string) {
    if (!code) throw new BadRequestException('Missing code from Google.');
    if (!state) throw new BadRequestException('Missing state from Google.');

    // Validate state — we only signed it ourselves with our JWT secret.
    let nextPath = '';
    try {
      const payload: any = this.jwt.verify(state);
      if (payload?.kind !== 'oauth_state') {
        throw new Error('bad kind');
      }
      nextPath = String(payload.next || '');
    } catch {
      throw new UnauthorizedException(
        'Sign-in session expired. Please try signing in with Google again.',
      );
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const tokenJson: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson?.id_token) {
      throw new UnauthorizedException(
        tokenJson?.error_description ||
          'Couldn’t finish Google sign-in. Please try again.',
      );
    }

    const profile = decodeJwtPayload<GoogleProfile>(tokenJson.id_token);
    if (!profile?.email) {
      throw new UnauthorizedException(
        'Google didn’t return an email for that account. Make sure the email is set on your Google profile and try again.',
      );
    }
    if (!profile.email_verified) {
      throw new UnauthorizedException(
        'Your Google email isn’t verified yet. Verify it on Google first, then try again.',
      );
    }

    const email = profile.email.trim().toLowerCase();
    // 1. Existing link by provider+id (fast path)
    let user = await this.prisma.user.findFirst({
      where: { oauth_provider: 'google', oauth_provider_id: profile.sub },
    });

    // 2. Find-or-link by verified email (matches user's "auto-link" choice)
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            oauth_provider: 'google',
            oauth_provider_id: profile.sub,
            is_verified: true,
            avatar_url: byEmail.avatar_url || profile.picture || null,
          },
        });
      }
    }

    // 3. Brand-new account.
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          full_name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || 'New user',
          school: '', // gets filled later in onboarding
          oauth_provider: 'google',
          oauth_provider_id: profile.sub,
          avatar_url: profile.picture || null,
          is_verified: true, // Google verified the email
          terms_accepted_at: new Date(),
        } as any,
      });
      // Fire welcome (non-blocking)
      this.email
        .sendWelcomeEmail(user.email, user.full_name)
        .catch((err) =>
          console.error('Failed to send welcome email (google)', err),
        );
    }

    if (user.is_suspended) {
      throw new UnauthorizedException(
        'This account has been suspended. Contact support if you think this is a mistake.',
      );
    }

    const accessToken = this.jwt.sign({
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      access_token: accessToken,
      next: nextPath,
      user: {
        id: user.id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        avatar_url: user.avatar_url,
      },
      frontend_success_url: this.frontendSuccessUrl,
    };
  }
}

function decodeJwtPayload<T = any>(jwt: string): T | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const json = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
