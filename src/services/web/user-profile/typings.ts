export interface UserProfileVo {
  id: string;
  username: string;
  nickname: string;
  gender: number;
  email: string;
  phone: string;
  avatar: string;
  deptName: string;
  registrationDate: string;
  pwdResetTime: string;
}

export interface BasicInfoDto {
  nickname: string;
  gender: number;
}

export interface PasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface PhoneDto {
  newPhone: string;
  captcha: string;
  currentPassword: string;
}

export interface EmailDto {
  newEmail: string;
  captcha: string;
  currentPassword: string;
}

export interface SocialBindVo {
  source: string;
  description: string;
  bound: boolean;
}
