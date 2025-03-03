import { Router } from 'express';
import { Login, Logout, Register } from '../controllers/users.controllers.js';
import jwt from 'jsonwebtoken';
import upload from '../utils/multer.js';
import passport from '../auth/passport.js';
import userModel from '../models/userModel.js';
import transporter from '../utils/nodemailer.js';
import userAuth from '../auth/authMiddleware.js';

const userRouter = Router();


userRouter.get('/auth/google', passport.authenticate('google', { scope: [ 'profile', 'email']}));
userRouter.get('/auth/google/callback',
    passport.authenticate('google', { session: false}),
    (req, res) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication failed" });
        }
        const token = jwt.sign(
            { id: req.user._id, email: req.user.email },
            process.env.JWT_SECRET,
            { expiresIn: "3d" }
        );
        res.status(200).json({
            success: true,
            message: "Authentication successful",
            user: req.user,
            token
        });
    }
)

userRouter.get('/auth/twitter', passport.authenticate('twitter'));
userRouter.get('/auth/twitter/callback',
    passport.authenticate('google', { session: false}),
    (req, res) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication failed" });
        }
        const token = jwt.sign(
            { id: req.user._id, email: req.user.email },
            process.env.JWT_SECRET,
            { expiresIn: "3d" }
        );
        res.status(200).json({
            success: true,
            message: "Authentication successful",
            user: req.user,
            token
        });
    }
)

userRouter.get('/auth/login/success', (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user,
    });
});

userRouter.get('/auth/login/failed', (req, res) => {
    res.status(401).json({
        success: false,
        user: null,
        message: 'Login failed. Please try again'
    });
});

userRouter.post("/set-password", userAuth, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user._id;
        if (!userId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please Login with your Twitter/Facebook/Google account to continue'
            });
        }

        let user = await userRouter.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.password = password; // Will be hashed before saving
        await user.save();

        res.json({ message: "Password set successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

userRouter.post("/change-password", userAuth, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user._id
        if (!userId || !password ) {
            return res.status(400).json({
                success: false,
                message: 'Please Login to change your Password'
            });
        }

        let user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.password = password; // Will be hashed before saving
        await user.save();

        res.status(201).json({ 
            success: true,
            message: "Password set successfully"
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

userRouter.post('/password-reset-otp', async(req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
        return res.status(400).json({
            success: false,
            message: 'E-mail is required'
        });
    }
    const user = await userModel.findOne({ email });
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Login failed. Please try again'
        });
    }
    const OTP = Math.floor(100_000 + Math.random() * 900_000).toString();
    user.resetPasswordOTP = OTP;
    user.resetPasswordOTPExpireAt = Date.now() + 15 * 60 * 1000;
    await user.save();

    const mailOptions = {
        from: process.env.SMTP_EMAIL,
        to: user.email,
        subject: 'Password Reset OTP',
        text: `Your Password reset OTP is ${OTP} and it expires in 15 minutes`
    }
    
    await transporter.sendMail(mailOptions)

    res.status(201).json({
        success: true,
        message: 'Password reset OTP sent successfully'
    })
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

userRouter.post('/reset-password', async (req, res) => {
    const { email, OTP, newPassword } = req.body;
    try {
        if (!email || !newPassword || !OTP) {
       return res.status(400).json({
        success: false,
        message: 'E-mail, OTP and newPassword are required'
       });
    }

    const user = await userModel.findOne({email});
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }
    if (user.resetPasswordOTP === '' || user.resetPasswordOTP !== OTP) {
        return res.status(401).json({
            success: false,
            message: 'Invalid OTP. Please try again'
        });
    }
    if (user.resetPasswordOTPExpireAt < Date.now()) {
        return res.status(410).json({
            success: false,
            message: 'OTP expired. Please request again'
        });
    }
    user.password = newPassword
    user.resetPasswordOTP = '';
    user.resetPasswordOTPExpireAt = Date.now();
    await user.save();

    res.status(201).json({
        success: true,
        message: 'Password reset successfully'
    });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
    
});


userRouter.post('/register', upload.single('thumbnail'), Register)
userRouter.post('/login', Login);
userRouter.post('/logout', Logout);

export default userRouter;