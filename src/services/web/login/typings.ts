export type AuthType = 'ACCOUNT' | 'PHONE' | 'EMAIL' | 'SOCIAL';

export type AccountLoginParams = {
  username: string;
  password: string;
  captcha: string;
  uuid: string;
  clientId?: string;
  authType?: AuthType;
};

export type PhoneLoginParams = {
  phone: string;
  captcha: string;
  clientId?: string;
  authType?: AuthType;
};

export type EmailLoginParams = {
  email: string;
  captcha: string;
  clientId?: string;
  authType?: AuthType;
};

export type LegacyLoginParams = {
  username?: string;
  password?: string;
  autoLogin?: boolean;
  type?: string;
};

export type LoginResponse = {
  token: string;
  tenantId: string;
};

export type ImageCaptchaResponse = {
  uuid: string;
  img: string;
  expireTime: number;
  isEnabled: boolean;
};

export type SocialAuthorizeResponse = {
  authorizeUrl: string;
};
