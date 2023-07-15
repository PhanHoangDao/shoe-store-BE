// config env
require("dotenv").config();
const { ACCESS_JWT_SECRET } = require("../../config/index");

// import jwt and and passport-jwt
const jwt = require("jsonwebtoken");
const JwtStrategy = require("passport-jwt").Strategy;
const { ExtractJwt } = require("passport-jwt");
// passport, passport-facebook, passport google
const passport = require("passport");
const facebookStrategy = require("passport-facebook").Strategy;
// passport google
const googleStrategy = require("passport-google-oauth20");

const jwtHelp = require("../../utils/jwtHelp");

const Account = require("../models/account.model.js");

// custom jwtFromRequest of JwtStrategy
var cookieExtractor = function (req, res) {
	var accessToken = null;
	if (req.cookies.Authorization) {
		accessToken = req.cookies.Authorization;
	}
	console.log(
		"🚀 ~ file: passport.mdw.js ~ line 21 ~ cookieExtractor ~ accessToken",
		accessToken
	);
	return accessToken;
};

// funtion to authenticate accessToken of user
passport.use(
	new JwtStrategy(
		{
			jwtFromRequest: cookieExtractor,
			secretOrKey: ACCESS_JWT_SECRET,
		},
		async (payload, done) => {
			try {
				console.log("🚀 ~ file: app.js ~ line 134 ~ payload", payload);
				// find user in database after user have access token
				const user = await Account.findOne({ userId: payload.userId });
				if (user) {
					// return info of user when authenticate successful, store in variable req.user
					return done(null, user);
				} else {
					return done(null, false);
				}
			} catch (err) {
				return done(err);
			}
		}
	)
);

// use google passport oauth 2
passport.use(
	new googleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: "https://localhost:3000/auth/google/callback",
			scope: ["profile", "email"],
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				//find user
				const existUser = await Account.findOne({ userId: profile.id });
				if (existUser) {
					return done(null, existUser);
				} else {
					const newUser = new Account({
						fullname: profile.displayName,
						userId: profile.id,
						email: profile.emails[0].value,
						address: "",
						numberPhone: "",
						permission: "2",
						authType: profile.provider,
						picture: profile.photos[0].value,
					});
					await newUser.save();
					//return info of user when authenticate successful, store in variable req.user
					return done(null, newUser);
				}
			} catch (err) {
				return done(null, {});
			}
		}
	)
);

// use passport-facebook
passport.use(
	new facebookStrategy(
		{
			clientID: process.env.FACEBOOK_CLIENT_ID,
			clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
			callbackURL: "https://localhost:3000/auth/facebook/callback",
			profileFields: ["id", "displayName", "photos", "email"],
		},
		async (token, refreshToken, profile, done) => {
			try {
				// find user in database if not exist user add new user
				// find user
				const existUser = await Account.findOne({ userId: profile.id });
				if (existUser) {
					return done(null, existUser);
				} else {
					const newUser = new Account({
						fullname: profile.displayName,
						userId: profile.id,
						email: profile.emails[0].value,
						address: "",
						numberPhone: "",
						permission: "2",
						authType: profile.provider,
						picture: profile.photos[0].value,
					});

					await newUser.save();
					// return info of user when authenticate successful, store in variable req.user
					return done(null, newUser);
				}
			} catch (err) {
				// catch err and prevent quit function
				return done(null, false);
			}
		}
	)
);

module.exports = {
	// optimize here with one authenticate function
	authAdmin: (req, res, next) => {
		try {
			const token = req.cookies.Authorization;

			// empty token
			if (!token) {
				return res.redirect("/");
			}

			const decode = jwt.decode(token);
			jwt.verify(token, ACCESS_JWT_SECRET);

			if (req.originalUrl.endsWith("/admin/", 7) && decode.permission !== 0) {
				return res.redirect("/");
			}
			
			next();
		} catch (err) {
			if (err.name === "TokenExpiredError") {
				jwtHelp.renewAccessToken(req, res);
				res.send("Token expired");
			}
		}
	},
	authCustomer: (req, res, next) => {
		try {
			jwtHelp.authAccessToken(req.headers.authorization.split(" ")[1], res);
			next();
		} catch (err) {
			// if accessToken expired, renew accessToken if refreshToken isn't expired
			res.status(401).send({
				message: "Authentication credentials were not provided.",
				status_code: 401,
			});
		}
	},
};
