// Signup link is hardcoded for now — no real "complete your signup" flow
// exists yet, so this points straight at the LMS itself.
const SIGNUP_LINK = 'https://lms.uom.lk/';

export interface WelcomeEmailData {
  username: string;
  password: string;
}

export function buildWelcomeEmailHtml({ username, password }: WelcomeEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #003366; margin-bottom: 4px;">Welcome to UoM LMS</h2>
      <p>Hi ${username},</p>
      <p>Your account has been created. Use the credentials below to sign in:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; color: #555555;">Username</td>
          <td style="padding: 8px 0; font-weight: bold;">${username}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #555555;">Temporary password</td>
          <td style="padding: 8px 0; font-weight: bold;">${password}</td>
        </tr>
      </table>
      <p>
        <a href="${SIGNUP_LINK}"
           style="display: inline-block; padding: 10px 20px; background-color: #003366; color: #ffffff; text-decoration: none; border-radius: 4px;">
          Sign in to UoM LMS
        </a>
      </p>
      <p style="color: #777777; font-size: 12px; margin-top: 24px;">
        For security, please change your password after your first login.
      </p>
    </div>
  `;
}
