import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from './models/User.js'; // We'll need to create this
import dotenv from 'dotenv';

dotenv.config();

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { googleId: profile.id },
        { email: profile.emails[0].value }
      ]
    });

    if (user) {
      // Update Google ID if user exists but doesn't have it
      if (!user.googleId) {
        user.googleId = profile.id;
        user.provider = 'google';
        await user.save();
      }
      return done(null, user);
    }

    // Create new user
    user = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      displayName: profile.displayName,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      profilePicture: profile.photos[0].value,
      provider: 'google',
      emailVerified: true
    });

    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/api/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name', 'picture.type(large)']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { facebookId: profile.id },
        { email: profile.emails[0].value }
      ]
    });

    if (user) {
      // Update Facebook ID if user exists but doesn't have it
      if (!user.facebookId) {
        user.facebookId = profile.id;
        user.provider = 'facebook';
        await user.save();
      }
      return done(null, user);
    }

    // Create new user
    user = new User({
      facebookId: profile.id,
      email: profile.emails[0].value,
      displayName: profile.displayName,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      profilePicture: profile.photos[0].value,
      provider: 'facebook',
      emailVerified: true
    });

    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

export default passport;