const { ACCESS_JWT_SECRET, REFRESH_JWT_SECRET } = require("../config/index");
require("dotenv").config();

const Account = require("../app/models/account.model");
const jwt = require("jsonwebtoken");

class jwtHelp {
	encodeAndStoreTokenAdmin(userId, permission, fullname, picture, res) {
		const accessToken = jwt.sign(
			{
				userId: userId,
				permission: permission,
				fullname: fullname,
				iat: new Date().getTime(),
				exp: new Date().setDate(new Date().getDate() + 3), // exp in 3 days
			},
			ACCESS_JWT_SECRET
		);

		const refreshToken = jwt.sign(
			{
				userId: userId,
				permission: permission,
				fullname: fullname,
				iat: new Date().getTime(),
				exp: new Date().setDate(new Date().getDate() + 210), // exp in 210 days
			},
			REFRESH_JWT_SECRET
		);

		// store accessToken
		res.cookie("Authorization", accessToken, {
			maxAge: process.env.TIME_COOKIE_ACCESS_TOKEN_EXPIRE, // three dates
			httpOnly: true,
		});
		// store refreshToken
		res.cookie("refreshToken", refreshToken, {
			maxAge: process.env.TIME_COOKIE_REFRESH_TOKEN_EXPIRE, // 210 dates
			httpOnly: true,
		});
		// store user info to use
		res.cookie(
			"userInfo",
			{
				userId: userId,
				userName: fullname,
				userPicture: picture,
			},
			{
				maxAge: process.env.TIME_COOKIE_EXPIRE,
				httpOnly: true,
			}
		);
	}

	encodeAndStoreToken(userId, permission, fullname) {
		const accessToken = jwt.sign(
			{
				userId: userId,
				permission: permission,
				fullname: fullname,
				iat: new Date().getTime(),
				exp: new Date().setDate(new Date().getDate() + 3), // exp in 3 days
			},
			ACCESS_JWT_SECRET
		);

		const refreshToken = jwt.sign(
			{
				userId: userId,
				permission: permission,
				fullname: fullname,
				iat: new Date().getTime(),
				exp: new Date().setDate(new Date().getDate() + 210), // exp in 210 days
			},
			REFRESH_JWT_SECRET
		);
		return { accessToken, refreshToken };
		// store accessToken
		// res.cookie("Authorization", accessToken, {
		// 	maxAge: process.env.TIME_COOKIE_ACCESS_TOKEN_EXPIRE, // three dates
		// 	httpOnly: true,
		// });
		// // store refreshToken
		// res.cookie("refreshToken", refreshToken, {
		// 	maxAge: process.env.TIME_COOKIE_REFRESH_TOKEN_EXPIRE, // 210 dates
		// 	httpOnly: true,
		// });
		// // store user info to use
		// res.cookie(
		// 	"userInfo",
		// 	{
		// 		userId: userId,
		// 		userName: fullname,
		// 		userPicture: picture,
		// 	},
		// 	{
		// 		maxAge: process.env.TIME_COOKIE_EXPIRE,
		// 		httpOnly: true,
		// 	}
		// );
	}

	createAccessToken(userId, permission, fullname) {
		return jwt.sign(
			{
				userId: userId,
				permission: permission,
				fullname: fullname,
				iat: new Date().getTime(),
				exp: new Date().setDate(new Date().getDate() + 3),
			},
			ACCESS_JWT_SECRET
		);
	}

	authAccessToken(token, res) {
		try {
			if (!token) {
				res.status(401).send({
					message: "Authentication credentials were not provided.",
					status_code: 401,
				});
			}
			// if have token start to decode and verify token
			const decode = jwt.decode(token);
			jwt.verify(token, ACCESS_JWT_SECRET);

			// return decode to auth for role
			return decode;
		} catch (err) {
			// if accessToken expired, renew accessToken if refreshToken isn't expired
			if (err.name === "TokenExpiredError") {
				res.send("Token expired");
			} else {
				res.send(400).send("Invalid token");
			}
		}
	}

	renewAccessToken(req, res) {
		const refreshToken = req.body.refreshToken;
		if (!refreshToken) {
			res.status(400).send();
		}
		try {
			const decode = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
			const accessToken = this.createAccessToken(
				decode.userId,
				decode.permission,
				decode.fullname
			);
			// res.cookie("Authorization", accessToken, {
			// 	maxAge: process.env.TIME_COOKIE_EXPIRE,
			// 	httpOnly: true,
			// });
			// return res.redirect("back");
			res.status(201).send(accessToken);
		} catch (err) {
			// if refreshToken is expired, redirect to home
			// if (err.name === "TokenExpiredError") {
			// 	return res.redirect("/");
			// }
			res.status(400).send(err);
		}
	}

	decodeTokenGetUserId(token) {
		const decode = jwt.decode(token);
		return decode?.userId;
	}

	decodeTokenGetPermission(token) {
		const decode = jwt.decode(token);
		return decode.permission;
	}
}

module.exports = new jwtHelp();
