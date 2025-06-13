import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { upsertStreamUser } from '../lib/stream.js';

export async function signup(req, res) {
  const { email, password, fullName } = req.body;

  console.log("Signup Request Body:", req.body);

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists, please use a different email' });
    }

    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    const user = await User.create({
      fullname: fullName,
      email,
      password,
      profilePic: randomAvatar,
    });

    try {
      await upsertStreamUser({
        id: user._id.toString(),
        name: user.fullname,
        image: user.profilePic || "",
      });
      console.log(`Stream user created for ${user.fullname}`);
    } catch (error) {
      console.log("Error creating Stream user:", error.message);
    }

    if (!process.env.JWT_SECRET_KEY) {
      throw new Error("JWT_SECRET_KEY not defined in environment");
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === 'production',
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        profilePic: user.profilePic,
      },
      token
    });

  } catch (error) {
    console.error("Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email' });

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '7d' }
    );

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === 'production',
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        profilePic: user.profilePic
      },
      token
    });
  } catch (error) {
    console.error("Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  res.clearCookie("jwt");
  res.status(200).json({ message: "Logged out successfully" });
}

export async function onboard(req, res) {
  try {
    const userId = req.user._id;
    const { fullName, bio, nativeLanguage, learningLanguage, location } = req.body;

    const missingFields = [
      !fullName && "fullName",
      !bio && "bio",
      !nativeLanguage && "nativeLanguage",
      !learningLanguage && "learningLanguage",
      !location && "location"
    ].filter(Boolean);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'All fields are required',
        missingFields
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        fullname: fullName,
        bio,
        nativeLanguage,
        learningLanguage,
        location,
        isOnboarded: true
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
try {
  await upsertStreamUser({
    id: updatedUser._id.toString(),
    name: updatedUser.fullname,
    image: updatedUser.profilePic || "",
  });
  console.log(`Stream user updated after onboarding for ${updatedUser.fullname}`);
} catch (streamError) {
  console.error("Error updating Stream user during onboarding:", streamError.message);
}


    res.status(200).json({
      success: true,
      message: 'User onboarded successfully',
      user: {
        id: updatedUser._id,
        fullname: updatedUser.fullname,
        bio: updatedUser.bio,
        nativeLanguage: updatedUser.nativeLanguage,
        learningLanguage: updatedUser.learningLanguage,
        location: updatedUser.location,
        profilePic: updatedUser.profilePic
      }
    });

  } catch (error) {
    console.error("Onboarding Error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
