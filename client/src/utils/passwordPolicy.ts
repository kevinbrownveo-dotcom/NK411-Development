/** Frontend şifrə policy yoxlayıcı (server ilə eyni qaydalar) */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password) return { valid: false, message: 'Şifrə boş ola bilməz' };
  if (password.length < 8) return { valid: false, message: 'Şifrə minimum 8 simvol olmalıdır' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Şifrədə ən azı 1 böyük hərf olmalıdır' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Şifrədə ən azı 1 kiçik hərf olmalıdır' };
  if (!/\d/.test(password)) return { valid: false, message: 'Şifrədə ən azı 1 rəqəm olmalıdır' };
  if (!/[@$!%*?&_\-#^()+=]/.test(password))
    return { valid: false, message: 'Şifrədə ən azı 1 xüsusi simvol (@$!%*?&_-#) olmalıdır' };
  return { valid: true };
}
