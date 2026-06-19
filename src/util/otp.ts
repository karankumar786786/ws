export function generateOTP():string{
    const otp = Math.random()*100000;
    return otp.toString();
}