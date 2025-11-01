import OTP from "../Models/otp.models.js";
import asyncHandler from "../Utils/asyncHandler.js";
import sendOTP from "../Utils/Email.js";
import jwt from "jsonwebtoken";
import User from "../Models/user.models.js";

const createRandomOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const options = {
  httpOnly: true,
  sameSite: "Lax", 
  secure: false,     
  maxAge: parseInt(process.env.JWT_EXPIRES_IN)
}

const generateToken = async(id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_STRING, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const generateOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const otpCode = createRandomOTP();

  await OTP.deleteMany({ email });

  const newOtp = new OTP({ email, OTP: otpCode });
  await newOtp.save();

  sendOTP(email, otpCode);

  res.status(200).json({
    message: "OTP sent to your email successfully",
  });

});

export const verifyOTPAndCreateUser = async (req, res) => {
  try {
    console.log("Incoming body:", req.body);

    const { email, otp, username, password, mobile } = req.body;

    if (!email || !otp || !username || !password || !mobile) {
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log("Step 1: Finding OTP doc");
    const otpDoc = await OTP.findOne({ email });

    if (!otpDoc) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    console.log("Step 2: Verifying OTP");
    const isMatch = await otpDoc.checkOTP(otp); // 👈 check otp type!
    console.log("OTP match result:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    console.log("Step 3: Deleting OTPs");
    await OTP.deleteMany({ email });

    console.log("Step 4: Checking existing user");
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    console.log("Step 6: Creating user");
    const newUser = await User.create({
      username,
      email,
      mobile,
      password
    });

    const token = await generateToken(newUser._id);

    console.log("Step 7: Sending response");
    return res.status(201).cookie('jwt', token, options).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });


  } catch (err) {
    console.error("❌ Error in verifyOTPAndCreateUser:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // 2. Find user and explicitly select password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3. Check if password is correct
    const isMatch = await user.correctPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 4. Create token (optional)
    const token = await generateToken(user._id);

    // 5. Send response
    res.status(200).cookie('jwt', token, options).json({
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        currentPlan: user.currentPlan,
        usdt: user.usdt,
        deposit: user.deposit,
        withdrawal: user.withdrawal,
      },
    });
  } catch (err) {
    console.error("❌ Error in loginUser:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const logoutUser = (req, res) => {
  // Same cookie name as you used for login
  res.cookie('jwt', '', options);

  return res.status(200).json({ message: 'Logged out successfully' });
};
